/*
  Warnings:

  - You are about to drop the column `icon` on the `categories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "icon",
ALTER COLUMN "color" SET DEFAULT '#1890ff';
