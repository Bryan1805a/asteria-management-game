import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GameState, ResourceType, JobType, TickResult } from '@asteria/shared_types'
import { Zap, Droplets, Wind, Coffee, Box, Shield, Activity, Clock, Hammer, LogOut, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react'
import Auth from './Auth'
import './App.css'

const API_BASE_URL = 'http://localhost:3001'

const getHeaders = () => {
  const token = localStorage.getItem('asteria_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

async function fetchGameState(): Promise<GameState> {
  const response = await fetch(`${API_BASE_URL}/game`, { headers: getHeaders() })
  if (!response.ok) throw new Error('Failed to load game state')
  return response.json()
}

async function advanceTime(hours: number): Promise<TickResult> {
  const response = await fetch(`${API_BASE_URL}/game/advance`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ hours }),
  })
  if (!response.ok) throw new Error('Failed to advance time')
  return response.json()
}

async function startJob(type: JobType): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/game/jobs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ type }),
  })
  if (!response.ok) throw new Error('Failed to start job')
}

async function queueStorageBayBuild(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/game/modules/build`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
  })
  if (!response.ok) throw new Error('Failed to queue construction')
}

function safeForecast(value: number, netPerHour: number, cap?: number): string {
  if (netPerHour < 0) {
    const hours = Math.floor(value / Math.abs(netPerHour))
    return `${hours}h to empty`
  }
  if (netPerHour > 0 && cap !== undefined && value < cap) {
    const hours = Math.floor((cap - value) / netPerHour)
    return `${hours}h to cap`
  }
  return 'Stable'
}

function getResourceNetDeltas(state: GameState): Record<ResourceType, number> {
  const deltas: Record<ResourceType, number> = {
    power: 0, oxygen: 0, water: 0, food: 0, rock: 0, metal: 0,
  }

  for (const module of state.modules) {
    if (module.status !== 'active') continue
    if (module.type === 'solar_array') deltas.power += 12 * module.efficiency
    if (module.type === 'habitat') {
      deltas.power -= 2; deltas.oxygen -= state.population
      deltas.water -= state.population; deltas.food -= state.population
    }
    if (module.type === 'recycler') {
      deltas.power -= 3; deltas.oxygen += 1; deltas.water += 2
    }
    if (module.type === 'mining_bay') deltas.power -= 5
    if (module.type === 'refinery') deltas.power -= 1
    if (module.type === 'storage_bay') deltas.power -= 1
  }

  for (const job of state.jobs) {
    if (job.status !== 'active') continue
    if (job.type === 'mine_rock') deltas.power -= 2
    if (job.type === 'refine_metal') deltas.power -= 3
    if (job.type === 'build_storage_bay') deltas.power -= 1
  }
  return deltas
}

const resourceIcons: Record<string, React.ReactNode> = {
  power: <Zap className="w-4 h-4 text-yellow-400" />,
  oxygen: <Wind className="w-4 h-4 text-blue-300" />,
  water: <Droplets className="w-4 h-4 text-blue-500" />,
  food: <Coffee className="w-4 h-4 text-orange-400" />,
  rock: <Box className="w-4 h-4 text-gray-400" />,
  metal: <Shield className="w-4 h-4 text-slate-300" />
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('asteria_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('asteria_username'));

  const queryClient = useQueryClient()
  const [lastTick, setLastTick] = useState<TickResult | null>(null)
  const [lastAction, setLastAction] = useState<string>('System Nominal')

  const gameStateQuery = useQuery({
    queryKey: ['gameState'],
    queryFn: fetchGameState,
    enabled: !!token,
    refetchOnWindowFocus: false,
    retry: 1
  })

  // Handle unauthorized logouts gracefully
  useEffect(() => {
    if (gameStateQuery.error?.message.includes('401') || gameStateQuery.error?.message.includes('403')) {
      handleLogout();
    }
  }, [gameStateQuery.error]);

  const advanceMutation = useMutation({
    mutationFn: advanceTime,
    onSuccess: (result) => {
      setLastTick(result)
      setLastAction(`Time advanced by ${result.hoursAdvanced} cycles`)
      queryClient.invalidateQueries({ queryKey: ['gameState'] })
    },
  })

  const jobMutation = useMutation({
    mutationFn: startJob,
    onSuccess: () => {
      setLastAction('Operation protocol engaged')
      queryClient.invalidateQueries({ queryKey: ['gameState'] })
    },
  })

  const buildMutation = useMutation({
    mutationFn: queueStorageBayBuild,
    onSuccess: () => {
      setLastAction('Construction sequence initiated')
      queryClient.invalidateQueries({ queryKey: ['gameState'] })
    },
  })

  const handleLogin = (newToken: string, newUsername: string) => {
    localStorage.setItem('asteria_token', newToken);
    localStorage.setItem('asteria_username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('asteria_token');
    localStorage.removeItem('asteria_username');
    setToken(null);
    setUsername(null);
    setLastTick(null);
    queryClient.clear();
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  const isBusy = advanceMutation.isPending || jobMutation.isPending || buildMutation.isPending
  const state = gameStateQuery.data

  const criticalAlertsCount = state?.alerts.filter((a) => a.serverity === 'critical').length ?? 0
  const netDeltas = useMemo(() => (state ? getResourceNetDeltas(state) : null), [state])
  const latestAlerts = useMemo(
    () => (state ? [...state.alerts].sort((a, b) => b.createdAtHour - a.createdAtHour).slice(0, 5) : []),
    [state]
  )
  const recentLogs = useMemo(
    () => (state ? [...state.eventLog].sort((a, b) => b.hour - a.hour).slice(0, 5) : []),
    [state]
  )

  return (
    <div className="min-h-screen bg-[#0b1020] text-blue-50 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col">
        {/* Top bar / Header */}
        <header className="bg-[#121a30]/80 backdrop-blur border border-blue-900/50 rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-blue-900/40 rounded-xl border border-blue-500/30 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Asteria Command</h1>
              <p className="text-sm text-blue-300/60 font-mono">Commander {username?.toUpperCase()} // STATUS: {lastAction}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <div className="flex bg-[#0b1020]/50 p-1 rounded-xl border border-blue-900/50">
              {[1, 5, 10, 24].map((hours) => (
                <button 
                  key={hours} 
                  disabled={isBusy || !state} 
                  onClick={() => advanceMutation.mutate(hours)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-blue-300 hover:text-white hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  +{hours}h
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-4 pl-4 border-l border-blue-800/50">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-blue-300/50 uppercase tracking-wider">Current Cycle</div>
                <div className="font-mono text-xl font-bold text-blue-100">{state?.currentHour ?? '---'}</div>
              </div>
              <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors shadow-sm cursor-pointer" title="Disconnect">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Global Loading / Error states */}
        {gameStateQuery.isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-60">
            <Activity className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
            <p className="text-blue-300 uppercase tracking-widest text-sm">Syncing telemetry...</p>
          </div>
        )}
        {gameStateQuery.isError && (
          <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-2xl text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-200">Connection lost at port 3001. Ensure backend systems are online.</p>
          </div>
        )}

        {/* Main Dashboard Grid */}
        {state && netDeltas && (
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Resources */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <section className="bg-[#121a30]/60 backdrop-blur rounded-2xl border border-blue-900/50 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold tracking-wide flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" /> Systems & Resources
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(state.resources) as ResourceType[]).map((resource) => {
                    const current = state.resources[resource]
                    const cap = state.storageCap[resource]
                    const net = netDeltas[resource]
                    const percentage = cap ? Math.min(100, Math.max(0, (current / cap) * 100)) : 100
                    const isDeficit = net < 0
                    
                    return (
                      <div key={resource} className="bg-[#0b1020]/60 rounded-xl p-4 border border-blue-800/30 relative overflow-hidden group">
                        {/* Progress Background */}
                        {cap !== undefined && (
                          <div className="absolute bottom-0 left-0 h-1 bg-blue-900/50 w-full">
                            <div 
                              className={`h-full transition-all duration-1000 ${percentage < 20 ? 'bg-red-500' : 'bg-blue-500'}`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <div className="flex items-center gap-2 text-blue-300 font-medium capitalize">
                            {resourceIcons[resource]} {resource}
                          </div>
                          <div className={`text-xs font-mono px-2 py-0.5 rounded-full ${isDeficit ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                            {net >= 0 ? '+' : ''}{net}/h
                          </div>
                        </div>
                        
                        <div className="flex items-baseline gap-2 relative z-10">
                          <span className="text-2xl font-bold font-mono">{current}</span>
                          {cap !== undefined && <span className="text-sm text-blue-500/50 font-mono">/ {cap}</span>}
                        </div>
                        <div className="text-xs text-blue-400/50 mt-1 uppercase tracking-wider relative z-10">
                          {safeForecast(current, net, cap)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Bottom Left: Jobs and Active Operations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-[#121a30]/60 backdrop-blur rounded-2xl border border-blue-900/50 p-6 flex flex-col h-full shadow-xl">
                  <h2 className="text-lg font-semibold tracking-wide flex items-center gap-2 mb-6">
                    <Clock className="w-5 h-5 text-purple-400" /> Active Operations
                  </h2>
                  
                  <div className="space-y-3 flex-1">
                    {state.jobs.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-blue-400/30 text-sm py-8 space-y-2">
                        <Box className="w-8 h-8 opacity-50" />
                        <span>No active processes</span>
                      </div>
                    )}
                    {state.jobs.map((job) => (
                      <div key={job.id} className="bg-[#0b1020]/50 rounded-xl p-3 border border-blue-800/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm text-blue-100 capitalize">{job.type.replace(/_/g, ' ')}</span>
                          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md font-mono">{job.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-blue-950 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                              style={{ width: `${(job.progressHours / job.requiredHours) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-purple-200/70">{job.progressHours}/{job.requiredHours}h</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-blue-900/50 grid grid-cols-2 gap-2">
                    <button disabled={isBusy} onClick={() => jobMutation.mutate('mine_rock')} className="btn-action">
                      <Box className="w-4 h-4 mr-1.5" /> Mine Rock
                    </button>
                    <button disabled={isBusy} onClick={() => jobMutation.mutate('refine_metal')} className="btn-action">
                      <Shield className="w-4 h-4 mr-1.5" /> Refine Metal
                    </button>
                    <button disabled={isBusy} onClick={() => buildMutation.mutate()} className="btn-action col-span-2 mt-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 font-bold tracking-wide">
                      <Hammer className="w-4 h-4 mr-1.5" /> Construct Storage Bay
                    </button>
                  </div>
                </section>

                <section className="bg-[#121a30]/60 backdrop-blur rounded-2xl border border-blue-900/50 p-6 flex flex-col h-full shadow-xl">
                  <h2 className="text-lg font-semibold tracking-wide flex items-center gap-2 mb-6">
                    <Box className="w-5 h-5 text-indigo-400" /> Station Modules
                  </h2>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {state.modules.map((module) => (
                      <div key={module.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0b1020]/50 border border-blue-800/20 hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                          <div>
                            <div className="text-sm font-medium text-blue-100">{module.name}</div>
                            <div className="text-xs text-blue-400/50 capitalize">{module.type.replace('_', ' ')}</div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-indigo-300/70 bg-indigo-500/10 px-2 py-1 rounded">
                          {module.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* Right Column: Logs and Alerts */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              <section className="bg-[#121a30]/60 backdrop-blur rounded-2xl border border-blue-900/50 p-6 shadow-xl flex-1 flex flex-col max-h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold tracking-wide flex items-center gap-2">
                    <AlertTriangle className={`w-5 h-5 ${criticalAlertsCount > 0 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`} /> 
                    Comms & Alerts
                  </h2>
                  {criticalAlertsCount > 0 && (
                    <span className="bg-red-500 animate-pulse text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {criticalAlertsCount} Critical
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-blue-300/50 font-semibold mb-3 sticky top-0 bg-[#121a30] py-1">Priority Alerts</h3>
                    <div className="space-y-2">
                      {latestAlerts.length === 0 && <p className="text-xs text-blue-400/40 italic pl-1">All systems clear.</p>}
                      {latestAlerts.map((alert) => (
                        <div key={alert.id} className={`p-3 rounded-xl border text-sm flex gap-3 items-start
                          ${alert.serverity === 'critical' ? 'bg-red-900/20 border-red-500/30 text-red-200' : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-200'}`}>
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 opacity-80" />
                          <div className="flex-1">
                            <div className="font-bold font-mono text-xs mb-1 opacity-90">{alert.code}</div>
                            <div className="opacity-90">{alert.message}</div>
                          </div>
                          <div className="text-xs font-mono opacity-50 whitespace-nowrap">H{alert.createdAtHour}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-blue-300/50 font-semibold mb-3 sticky top-0 bg-[#121a30] py-1">System Events</h3>
                    <div className="space-y-2">
                      {recentLogs.length === 0 && <p className="text-xs text-blue-400/40 italic pl-1">No notable events.</p>}
                      {recentLogs.map((event) => (
                        <div key={event.id} className="flex gap-3 text-sm p-3 rounded-xl bg-[#0b1020]/30 border border-blue-900/30 hover:bg-[#0b1020]/60 transition-colors">
                          <div className="w-12 shrink-0 font-mono text-blue-500/50 text-xs mt-0.5">H{event.hour}</div>
                          <div className="text-blue-200/80">{event.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {lastTick && (
                <section className="bg-gradient-to-br from-indigo-900/40 to-[#121a30]/80 rounded-2xl border border-indigo-500/30 p-5 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                  <h3 className="text-sm font-semibold text-indigo-300 mb-2 flex items-center gap-1.5"><ChevronRight className="w-4 h-4"/> End of Cycle Report</h3>
                  <div className="text-sm text-indigo-100/80 space-y-1 pl-5">
                    <p>Cycles Processed: <span className="font-mono text-white">{lastTick.hoursAdvanced}</span></p>
                    {lastTick.stoppedEarly && (
                      <p className="text-yellow-400 mt-2 p-2 bg-yellow-400/10 rounded border border-yellow-400/20">
                        Halted Early: {lastTick.stopReason}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>

          </main>
        )}
      </div>
    </div>
  )
}

export default App
