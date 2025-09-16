-- CreateTable
CREATE TABLE "public"."GameRun" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameRun_difficulty_seconds_idx" ON "public"."GameRun"("difficulty", "seconds");
