import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {advanceTime} from "@asteria/sim_core";
import {recipeDefinition} from "@asteria/game_config";
import {advanceSchema, badRequest, jobSchema} from "./validation";
import {loadGameState, saveGameState, prisma} from "./persistence";

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "asteria_super_secret_key";

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

// Authentication Middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        (req as any).user = user;
        next();
    });
}
function getUserId(req: Request): number {
    return (req as any).user.userId;
}

// Auth Endpoints
app.post("/auth/register", asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: "User already exists" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { username, password: hashedPassword } });
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({ token, username });
}));

app.post("/auth/login", asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({ token, username });
}));

// API Endpoints
// Load game state
app.get("/game", authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const state = await loadGameState(getUserId(req));
    return res.json(state);
}));

// Advance time
app.post("/game/advance", authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const parsed = advanceSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return badRequest(res, "Invalid request body for advance endpoint.", parsed.error.flatten());
    }

    const hoursToAdvanced = parsed.data.hours ?? 1;
    const userId = getUserId(req);
    const currentState = await loadGameState(userId);

    // Call the simmulation engine
    const tickResult = advanceTime(currentState, hoursToAdvanced);

    // Save the new mutated state to the JSON file
    await saveGameState(userId, tickResult.state);

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
app.post("/game/jobs", authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const parsed = jobSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return badRequest(res, "Invalid request body for jobs endpoint.", parsed.error.flatten());
    }

    const {type} = parsed.data;
    const userId = getUserId(req);
    const currentState = await loadGameState(userId);

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
    await saveGameState(userId, currentState);

    return res.json({message: "Job started successfully", job: newJob});
}));

// Queue construction
app.post("/game/modules/build", authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const currentState = await loadGameState(userId);

    const buildJob = {
        id: `build_${Date.now()}`,
        type: "build_storage_bay" as const,
        progressHours: 0,
        requiredHours: 24,
        status: "active" as const,
    };

    currentState.jobs.push(buildJob);
    await saveGameState(userId, currentState);

    return res.json({message: "Storage Bay construction queued", job: buildJob});
}));

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Asteria Station Backend running on http://localhost:${PORT}`);
});