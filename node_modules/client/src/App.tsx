import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GameState, ResourceType, JobType, TickResult } from '@asteria/shared_types'
import './App.css'

const GAME_ID = 1
const API_BASE_URL = 'http://localhost:3001'

async function fetchGameState(): Promise<GameState> {
  const response = await fetch(`${API_BASE_URL}/game/${GAME_ID}`)
  if (!response.ok) {
    throw new Error('Failed to load game state')
  }
  return response.json()
}

async function advanceTime(hours: number): Promise<TickResult> {
  const response = await fetch(`${API_BASE_URL}/game/${GAME_ID}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours }),
  })
  if (!response.ok) {
    throw new Error('Failed to advance time')
  }
  return response.json()
}

async function startJob(type: JobType): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/game/${GAME_ID}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  if (!response.ok) {
    throw new Error('Failed to start job')
  }
}

async function queueStorageBayBuild(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/game/${GAME_ID}/modules/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    throw new Error('Failed to queue construction')
  }
}

function safeForecast(value: number, netPerHour: number, cap?: number): string {
  if (netPerHour < 0) {
    const hours = Math.floor(value / Math.abs(netPerHour))
    return `${hours}h to empty`
  }
  if (netPerHour > 0 && cap !== undefined && value < cap) {
    const hours = Math.floor((cap - value) / netPerHour)
    return `${hours}h to full`
  }
  return 'stable'
}

function getResourceNetDeltas(state: GameState): Record<ResourceType, number> {
  const deltas: Record<ResourceType, number> = {
    power: 0,
    oxygen: 0,
    water: 0,
    food: 0,
    rock: 0,
    metal: 0,
  }

  for (const module of state.modules) {
    if (module.status !== 'active') continue
    if (module.type === 'solar_array') deltas.power += 12 * module.efficiency
    if (module.type === 'habitat') {
      deltas.power -= 2
      deltas.oxygen -= state.population
      deltas.water -= state.population
      deltas.food -= state.population
    }
    if (module.type === 'recycler') {
      deltas.power -= 3
      deltas.oxygen += 1
      deltas.water += 2
    }
    if (module.type === 'mining_bay') deltas.power -= 5
    if (module.type === 'refinery') deltas.power -= 1
    if (module.type === 'storage_bay') deltas.power -= 1
  }

  for (const job of state.jobs) {
    if (job.status !== 'active') continue
    if (job.type === 'mine_rock') {
      deltas.power -= 2
    }
    if (job.type === 'refine_metal') {
      deltas.power -= 3
    }
    if (job.type === 'build_storage_bay') {
      deltas.power -= 1
    }
  }

  return deltas
}

function App() {
  const queryClient = useQueryClient()
  const [lastTick, setLastTick] = useState<TickResult | null>(null)
  const [lastAction, setLastAction] = useState<string>('Idle')

  const gameStateQuery = useQuery({
    queryKey: ['gameState'],
    queryFn: fetchGameState,
    refetchOnWindowFocus: false,
  })

  const advanceMutation = useMutation({
    mutationFn: advanceTime,
    onSuccess: (result) => {
      setLastTick(result)
      setLastAction(`Advanced ${result.hoursAdvanced}h`)
      queryClient.invalidateQueries({ queryKey: ['gameState'] })
    },
  })

  const jobMutation = useMutation({
    mutationFn: startJob,
    onSuccess: () => {
      setLastAction('Job queued')
      queryClient.invalidateQueries({ queryKey: ['gameState'] })
    },
  })

  const buildMutation = useMutation({
    mutationFn: queueStorageBayBuild,
    onSuccess: () => {
      setLastAction('Storage Bay construction queued')
      queryClient.invalidateQueries({ queryKey: ['gameState'] })
    },
  })

  const isBusy = advanceMutation.isPending || jobMutation.isPending || buildMutation.isPending

  const state = gameStateQuery.data
  const criticalAlertsCount = state?.alerts.filter((a) => a.serverity === 'critical').length ?? 0
  const netDeltas = useMemo(() => (state ? getResourceNetDeltas(state) : null), [state])
  const latestAlerts = useMemo(
    () => (state ? [...state.alerts].sort((a, b) => b.createdAtHour - a.createdAtHour).slice(0, 6) : []),
    [state]
  )
  const recentLogs = useMemo(
    () => (state ? [...state.eventLog].sort((a, b) => b.hour - a.hour).slice(0, 6) : []),
    [state]
  )

  return (
    <div className="layout">
      <header className="topbar card">
        <div>
          <h1>Asteria Station Dashboard</h1>
          <p className="muted">Hour {state?.currentHour ?? '--'} | Action: {lastAction}</p>
        </div>
        <div className="controls">
          {[1, 5, 10, 24, 30].map((hours) => (
            <button key={hours} disabled={isBusy || !state} onClick={() => advanceMutation.mutate(hours)}>
              +{hours}h
            </button>
          ))}
          <button disabled={isBusy || !state} onClick={() => gameStateQuery.refetch()}>
            Reload
          </button>
        </div>
        <div className="critical">Critical Alerts: {criticalAlertsCount}</div>
      </header>

      {gameStateQuery.isLoading && <p>Loading station state...</p>}
      {gameStateQuery.isError && <p className="error">Could not load game state. Is the server running on port 3001?</p>}

      {state && netDeltas && (
        <main className="grid">
          <section className="card">
            <h2>Resources</h2>
            <div className="table">
              {(Object.keys(state.resources) as ResourceType[]).map((resource) => {
                const current = state.resources[resource]
                const cap = state.storageCap[resource]
                const net = netDeltas[resource]
                return (
                  <div className="row" key={resource}>
                    <span>{resource}</span>
                    <span>{current}{cap !== undefined ? ` / ${cap}` : ''}</span>
                    <span className={net >= 0 ? 'up' : 'down'}>
                      {net >= 0 ? '+' : ''}{net}/h
                    </span>
                    <span>{safeForecast(current, net, cap)}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="card">
            <h2>Jobs & Construction</h2>
            <div className="actions">
              <button disabled={isBusy} onClick={() => jobMutation.mutate('mine_rock')}>Start Mine Rock</button>
              <button disabled={isBusy} onClick={() => jobMutation.mutate('refine_metal')}>Start Refine Metal</button>
              <button disabled={isBusy} onClick={() => buildMutation.mutate()}>Build Storage Bay</button>
            </div>
            <div className="list">
              {state.jobs.length === 0 && <p className="muted">No active or completed jobs yet.</p>}
              {state.jobs.map((job) => (
                <div key={job.id} className="list-item">
                  <strong>{job.type}</strong>
                  <span>{job.progressHours}/{job.requiredHours}h</span>
                  <span>{job.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Modules</h2>
            <div className="list">
              {state.modules.map((module) => (
                <div key={module.id} className="list-item">
                  <strong>{module.name}</strong>
                  <span>{module.type}</span>
                  <span>{module.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Alerts & Logs</h2>
            <h3>Latest Alerts</h3>
            <div className="list">
              {latestAlerts.length === 0 && <p className="muted">No alerts yet.</p>}
              {latestAlerts.map((alert) => (
                <div key={alert.id} className={`list-item ${alert.serverity}`}>
                  <strong>{alert.code}</strong>
                  <span>{alert.message}</span>
                  <span>h{alert.createdAtHour}</span>
                </div>
              ))}
            </div>
            <h3>Recent Events</h3>
            <div className="list">
              {recentLogs.length === 0 && <p className="muted">No events yet.</p>}
              {recentLogs.map((event) => (
                <div key={event.id} className="list-item">
                  <strong>h{event.hour}</strong>
                  <span>{event.message}</span>
                </div>
              ))}
            </div>
          </section>

          {lastTick && (
            <section className="card full">
              <h2>Last Tick Report</h2>
              <p>
                Advanced: {lastTick.hoursAdvanced}h | Stopped early: {String(lastTick.stoppedEarly)}
                {lastTick.stopReason ? ` | Reason: ${lastTick.stopReason}` : ''}
              </p>
            </section>
          )}
        </main>
      )}
    </div>
  )
}

export default App
