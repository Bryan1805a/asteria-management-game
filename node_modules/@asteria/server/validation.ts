import { JobType } from "@asteria/shared_types";
import { recipeDefinition } from "@asteria/game_config";
import { Response } from "express";
import { z } from "zod";

const validJobTypes = Object.keys(recipeDefinition) as [JobType, ...JobType[]];

export const advanceSchema = z.object({
  hours: z.number().int().min(1).max(30).optional(),
});

export const jobSchema = z.object({
  type: z.enum(validJobTypes),
});

export function badRequest(res: Response, error: string, details?: unknown) {
  return res.status(400).json({
    error,
    ...(details ? { details } : {}),
  });
}
