/*
  Warnings:

  - Added the required column `aamarId` to the `AcademicYear` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "aamarId" TEXT NOT NULL;
