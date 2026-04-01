// RESOURCES
export type ResourceType = 
    | "power"
    | "oxygen"
    | "water"
    | "food"
    | "rock"
    | "metal";

export type ResourceStore = Record<ResourceType, number>;

// MODULES
export type ModuleType =
    | "habitat"
    | "solar_array"
    | "recycler"
    | "mining_bay"
    | "refinery"
    | "storage_bay";

export type ModuleStatus = "active" | "offline" | "damaged" | "constructing";

export type ModuleInstance = {
    id: string;
    type: ModuleType;
    name: string;
    status: ModuleStatus;
    efficiency: number;
};

// JOBS
export type JobType =
    | "mine_rock"
    | "refine_metal"
    | "build_storage_bay"
    | "repair_module";

export type JobStatus = "queued" | "active" | "paused" | "completed";

export type Job = {
    id: string;
    type: JobType;
    moduleId?: string;
    progressHours: number;
    requiredHours: number;
    status: JobStatus;
};

// ALerts and Logs
export type AlertSeverity = "info" | "warning" | "critical";

export type Alert = {
    id:string;
    serverity: AlertSeverity;
    code: string;
    message: string;
    createdAtHour: number;
};

export type EventLogEntry = {
    id: string;
    hour: number;
    message: string;
};

// Placeholder for auto-pause
export type AutoPauseRules = Record<string, boolean>;

export type GameState = {
    currentHour: number;
    population: number;
    resources: ResourceStore;
    storageCap: Partial<ResourceStore>;
    modules: ModuleInstance[];
    jobs: Job[];
    alerts: Alert[];
    eventLog: EventLogEntry[];
    autoPauseRules: AutoPauseRules;
};

export type HourlyReport = {
    hour: number;
    events: EventLogEntry[];
    alerts: Alert[];
};

export type TickResult = {
    state: GameState;
    hoursAdvanced: number;
    stoppedEarly: boolean;
    stopReason?: string;
    hourlyReports: HourlyReport[];
};