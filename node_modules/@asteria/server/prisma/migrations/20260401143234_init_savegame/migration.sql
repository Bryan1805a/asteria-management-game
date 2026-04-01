-- CreateTable
CREATE TABLE "SaveGame" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Asteria Station',
    "stateJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaveGame_pkey" PRIMARY KEY ("id")
);
