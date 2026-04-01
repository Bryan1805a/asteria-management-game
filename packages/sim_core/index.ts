import { GameState, ModuleInstance } from "@asteria/shared_types";
import { moduleDefinition, recipeDefinition } from "@asteria/game_config";

// Default phase
export const createInitialGameState = (): GameState => ({
    currentHour: 1,
    population: 10,
    resources: {
        power: 100,
        oxygen: 120,
        water: 120,
        food: 120,
        rock: 20,
        metal: 10,
    },

    storageCap: {
        oxygen: 150,
        water: 150,
        food: 150,
        rock: 100,
        metal: 100
    },

    modules: [
        {id: "m_hab_1", type: "habitat", name: "Habitat Alpha", status: "active", efficiency: 1},
        {id: "m_solar_1", type: "solar_array", name: "Solar Array 1", status: "active", efficiency: 1},
        {id: "m_solar_2", type: "solar_array", name: "Solar Array 2", status: "active", efficiency: 1},
        {id: "m_rec_1", type: "recycler", name: "Water/O2 Recycler", status: "active", efficiency: 1},
        {id: "m_mine_1", type: "mining_bay", name: "Mining Control", status: "active", efficiency: 1},
        {id: "m_ref_1", type: "refinery", name: "Main Refinery", status: "active", efficiency: 1},
        {id: "m_store_1", type: "storage_bay", name: "Cargo Bay 1", status: "active", efficiency: 1},
    ],

    jobs: [],
    alerts: [],
    eventLog: [],
    autoPauseRules: {
        critical_oxygen: true,
        critical_power: true,
    },
});

// The Simulation Engine (TICKS)
export function advanceOneHour(state: GameState): GameState {
    // Create a copy of state to let original state safe
    const nextState = JSON.parse(JSON.stringify(state)) as GameState;

    nextState.currentHour += 1;

    // Apply passive module effects (Modules consumption)
    for (const mod of nextState.modules) {
        if (mod.status !== "active") continue;

        const def = moduleDefinition[mod.type];

        // Apply power changes
        if (def.powerDeltaPerHour !== undefined) {
            nextState.resources.power += def.powerDeltaPerHour * mod.efficiency;
        }

        // Apply habitat consumption based on population
        if (def.oxygenDeltaPerHourPerPop !== undefined) {
            nextState.resources.oxygen += (def.oxygenDeltaPerHourPerPop * nextState.population);
        }
        if (def.waterDeltaPerHourPerPop !== undefined) {
            nextState.resources.water += (def.waterDeltaPerHourPerPop * nextState.population);
        }
        if (def.foodDeltaPerHourPerPop !== undefined) {
            nextState.resources.food += (def.foodDeltaPerHourPerPop * nextState.population);
        }

        // Apply recycler recovery
        if (def.waterRecoveryPerHour !== undefined) {
            nextState.resources.water += def.waterRecoveryPerHour;
        }
        if (def.oxygenSupportPerHour) {
            nextState.resources.oxygen += def.oxygenSupportPerHour;
        }
    }

    // Progress active jobs handle completions
    for (const job of nextState.jobs) {
        if (job.status !== "active") continue;

        const recipe = recipeDefinition[job.type];
        if (!recipe) continue;

        // Deduct hourly power cost for running the machinery
        if (recipe.powerCostPerHour) {
            nextState.resources.power -= recipe.powerCostPerHour;
        }

        // Progress the job by 1 hour
        job.progressHours += 1;

        // Check if the job has reached its required duration
        if (job.progressHours >= recipe.durationHours) {
            job.status = "completed";

            // Deduct inputs consumed upon completion
            if (recipe.inputOnCompletion) {
                for (const [res, amount] of Object.entries(recipe.inputOnCompletion)) {
                    const resourceKey = res as keyof typeof nextState.resources;
                    nextState.resources[resourceKey] -= amount;

                    // Prevent resources from dropping below zero
                    if (nextState.resources[resourceKey] < 0) {
                        nextState.resources[resourceKey] = 0;
                    }
                }
            }

            // Add the generated ouputs to the station's storage
            if (recipe.output) {
                for (const [res, amount] of Object.entries(recipe.output)) {
                    const resourceKey = res as keyof typeof nextState.resources;
                    nextState.resources[resourceKey] += amount;
                }
            }

            // Log the event
            nextState.eventLog.push({
                id: `log_${nextState.currentHour}_${job.id}`,
                hour: nextState.currentHour,
                message: `Job completed: ${job.type}`,
            });
        }
    }

    // Clamp storage and detect overflow
    for (const [res, currentAmount] of Object.entries(nextState.resources)) {
        const resourceKey = res as keyof typeof nextState.resources;
        const cap = nextState.storageCap[resourceKey];

        // Clamp the value down to the max if it exceeded cap
        if (cap !== undefined && currentAmount > cap) {
            nextState.resources[resourceKey] = cap;

            // Add "overflow" warning later
        }
    }

    // Evaluate system health and Generate alerts
    // Power check
    if (nextState.resources.power < 0) {
        nextState.resources.power = 0; // No negative power

        nextState.alerts.push({
            id: `alert_power_${nextState.currentHour}`,
            serverity: "critical",
            code: "CRITICAL_POWER",
            message: "Station power reserves depleted! Machinery offline.",
            createdAtHour: nextState.currentHour,
        });
    }

    // Life Support Checks
    const lifeSupportChecks = ["oxygen", "water", "food"] as const;

    for (const ls of lifeSupportChecks) {
        // Trigger a warning if resource drops <= 10
        if (nextState.resources[ls] <= 10) {
            const isCritical = nextState.resources[ls] <= 0;
            const severity = isCritical ? "critical" : "warning";

            if (isCritical) {
                nextState.resources[ls] = 0;
            }

            nextState.alerts.push({
                id: `alert_${ls}_${nextState.currentHour}`,
                serverity: severity,
                code: isCritical ? `CRITICAL_${ls.toUpperCase()}` : `LOW_${ls.toUpperCase}`,
                message: isCritical
                    ? `${ls.toUpperCase()} depleted! Population at immediate risk.`
                    : `${ls.toUpperCase()} reserves are running dangerously low.`,
                createdAtHour: nextState.currentHour,
            });
        }
    }

    return nextState;
}