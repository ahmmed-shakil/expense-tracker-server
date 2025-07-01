/*
  Warnings:

  - You are about to drop the column `period` on the `budgets` table. All the data in the column will be lost.
  - Made the column `endDate` on table `budgets` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "budgets" DROP COLUMN "period",
ALTER COLUMN "endDate" SET NOT NULL;
