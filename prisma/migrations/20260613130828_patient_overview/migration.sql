-- CreateTable
CREATE TABLE "AiPatientOverview" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patterns" TEXT,
    "recurringThemes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "progressTrends" TEXT,
    "unresolvedIssues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPatientOverview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiPatientOverview_patientId_key" ON "AiPatientOverview"("patientId");

-- AddForeignKey
ALTER TABLE "AiPatientOverview" ADD CONSTRAINT "AiPatientOverview_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
