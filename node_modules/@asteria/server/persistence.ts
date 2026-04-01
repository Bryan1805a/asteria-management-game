import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { GameState } from "@asteria/shared_types";
import { createInitialGameState } from "@asteria/sim_core";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizeLegacyAlertCodes(state: GameState): boolean {
  let changed = false;

  for (const alert of state.alerts) {
    const alertIdMatch = /^alert_([a-z]+)_\d+$/i.exec(alert.id);
    const resourceFromId = alertIdMatch?.[1];

    if (alert.serverity === "warning" && resourceFromId) {
      const expectedCode = `LOW_${resourceFromId.toUpperCase()}`;
      if (alert.code !== expectedCode) {
        alert.code = expectedCode;
        changed = true;
      }
    }
  }

  return changed;
}

export async function loadGameState(gameId: number): Promise<GameState> {
  const existing = await prisma.saveGame.findUnique({ where: { id: gameId } });

  if (!existing) {
    const newState = createInitialGameState();
    await prisma.saveGame.create({
      data: {
        id: gameId,
        stateJson: newState,
      },
    });
    return newState;
  }

  const state = existing.stateJson as unknown as GameState;
  if (normalizeLegacyAlertCodes(state)) {
    await saveGameState(gameId, state);
  }

  return state;
}

export async function saveGameState(gameId: number, state: GameState): Promise<void> {
  await prisma.saveGame.upsert({
    where: { id: gameId },
    update: { stateJson: state },
    create: {
      id: gameId,
      stateJson: state,
    },
  });
}
