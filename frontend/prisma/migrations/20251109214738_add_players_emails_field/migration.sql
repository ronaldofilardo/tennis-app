-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "sportType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "nickname" TEXT,
    "playerP1" TEXT NOT NULL,
    "playerP2" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "score" TEXT,
    "winner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playersEmails" TEXT[],
    "completedSets" TEXT,
    "matchState" TEXT,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);
