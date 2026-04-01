import { ModuleType, JobType, ResourceType } from "@asteria/shared_types";

type ModuleDefinitionEntry = {
    name: string;
    powerDeltaPerHour: number;
    oxygenDeltaPerHourPerPop?: number;
    waterDeltaPerHourPerPop?: number;
    foodDeltaPerHourPerPop?: number;
    waterRecoveryPerHour?: number;
    oxygenSupportPerHour?: number;
    capacityIncrease?: Partial<Record<ResourceType, number>>;
};

export type RecipeDefinitionEntry = {
    durationHours: number;
    powerCostPerHour: number;
    inputOnCompletion?: Partial<Record<ResourceType, number>>;
    output: Partial<Record<ResourceType, number>>;
    requiredModule: ModuleType;
};

// Passive hourly effects of each module type
export const moduleDefinition: Record<ModuleType, ModuleDefinitionEntry> = {
    habitat: {
        name: "Habitar Module",
        powerDeltaPerHour: -2,
        oxygenDeltaPerHourPerPop: -1,
        waterDeltaPerHourPerPop: -1,
        foodDeltaPerHourPerPop: -1,
    },

    solar_array: {
        name: "Solar Array",
        powerDeltaPerHour: 12,
    },

    recycler: {
        name: "Recycler",
        powerDeltaPerHour: -3,
        waterRecoveryPerHour: 2,
        oxygenSupportPerHour: 1,
    },

    mining_bay: {
        name: "Mining Control Bay",
        powerDeltaPerHour: -5,
    },

    refinery: {
        name: "Refinery",
        powerDeltaPerHour: -1,
    },

    storage_bay: {
        name: "Storage Bay",
        powerDeltaPerHour: -1,
        capacityIncrease: {
            rock: 100,
            metal: 100,
        },
    }
};

// Rules and costs for player-initiated jobs
export const recipeDefinition: Partial<Record<JobType, RecipeDefinitionEntry>> = {
    mine_rock: {
        durationHours: 13,
        powerCostPerHour: 2,
        output: { rock: 50 },
        requiredModule: "mining_bay",
    },

    refine_metal: {
        durationHours: 10,
        powerCostPerHour: 3,
        inputOnCompletion: { rock: 20 },
        output: { metal: 10 },
        requiredModule: "refinery",
    },
};