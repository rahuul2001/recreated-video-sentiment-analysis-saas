/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clerkId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clerkId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add clerkId with a temporary default, then remove it
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;
ALTER TABLE "User" ADD COLUMN "imageUrl" TEXT;

-- Update existing rows with a placeholder clerkId based on their id
UPDATE "User" SET "clerkId" = 'legacy_' || "id" WHERE "clerkId" IS NULL;

-- Now make clerkId NOT NULL
ALTER TABLE "User" ALTER COLUMN "clerkId" SET NOT NULL;

-- Drop the old passwordHash column
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
