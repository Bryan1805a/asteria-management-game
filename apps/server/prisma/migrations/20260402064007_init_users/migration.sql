-- AlterTable
CREATE SEQUENCE savegame_id_seq;
ALTER TABLE "SaveGame" ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "id" SET DEFAULT nextval('savegame_id_seq');
ALTER SEQUENCE savegame_id_seq OWNED BY "SaveGame"."id";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "SaveGame" ADD CONSTRAINT "SaveGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
