import express, { Request, Response } from "express";
import cors from "cors";
import {advanceTime} from "@asteria/sim_core";
import {recipeDefinition} from "@asteria/game_config";
import {advanceSchema, badRequest, jobSchema} from "./validation";
import {loadGameState, saveGameState} from "./persistence";

const app = express();
app.use(cors());
app.use(express.json());

function getGameId(req: Request): number {
    const parsed = Number(req.params.id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function asyncHandler(
    fn: (req: Request, res: Response) => Promise<Response | void>,
) {
    return (req: Request, res: Response) => {
        void fn(req, res).catch((error: unknown) => {
            console.error("Unhandled API error:", error);
            res.status(500).json({error: "Internal server error"});
        });
    };
}

// API Endpoints
// Load game state
app.get("/game/:id", asyncHandler(async (req: Request, res: Response) => {
    const state = await loadGameState(getGameId(req));
    return res.json(state);
}));

// Advance time
app.post("/game/:id/advance", asyncHandler(async (req: Request, res: Response) => {
    const parsed = advanceSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return badRequest(res, "Invalid request body for advance endpoint.", parsed.error.flatten());
    }

    const hoursToAdvanced = parsed.data.hours ?? 1;
    const gameId = getGameId(req);
    const currentState = await loadGameState(gameId);

    // Call the simmulation engine
    const tickResult = advanceTime(currentState, hoursToAdvanced);

    // Save the new mutated state to the JSON file
    await saveGameState(gameId, tickResult.state);

    // Return full report to the client
    return res.json({
        hoursAdvanced: tickResult.hoursAdvanced,
        stoppedEarly: tickResult.stoppedEarly,
        stopReason: tickResult.stopReason,
        state: tickResult.state,
        hourlyReports: tickResult.hourlyReports,
    });
}));

// Start a job
app.post("/game/:id/jobs", asyncHandler(async (req: Request, res: Response) => {
    const parsed = jobSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return badRequest(res, "Invalid request body for jobs endpoint.", parsed.error.flatten());
    }

    const {type} = parsed.data;
    const gameId = getGameId(req);
    const currentState = await loadGameState(gameId);

    // Validation the requested job
    const recipe = recipeDefinition[type as keyof typeof recipeDefinition];
    if (!recipe) {
        return badRequest(res, "Invalid or unknown job type.");
    }

    // Create the new job object
    const newJob = {
        id: `job_${Date.now()}`,
        type: type,
        progressHours: 0,
        requiredHours: recipe.durationHours,
        status: "active" as const,
    };

    // Mutation and save to the JSON file
    currentState.jobs.push(newJob);
    await saveGameState(gameId, currentState);

    return res.json({message: "Job started successfully", job: newJob});
}));

// Queue construction
app.post("/game/:id/modules/build", asyncHandler(async (req: Request, res: Response) => {
    const gameId = getGameId(req);
    const currentState = await loadGameState(gameId);

    const buildJob = {
        id: `build_${Date.now()}`,
        type: "build_storage_bay" as const,
        progressHours: 0,
        requiredHours: 24,
        status: "active" as const,
    };

    currentState.jobs.push(buildJob);
    await saveGameState(gameId, currentState);

    return res.json({message: "Storage Bay construction queued", job: buildJob});
}));

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Asteria Station Backend running on http://localhost:${PORT}`);
});