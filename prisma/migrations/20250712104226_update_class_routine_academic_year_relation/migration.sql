/*
  Warnings:

  - You are about to drop the column `academicYearid` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `academicYear` on the `ClassRoutine` table. All the data in the column will be lost.
  - Added the required column `academicYearId` to the `ClassRoutine` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_academicYearid_fkey";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "academicYearid",
ADD COLUMN     "academicYearId" TEXT;

-- AlterTable
ALTER TABLE "ClassRoutine" DROP COLUMN "academicYear",
ADD COLUMN     "academicYearId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoutine" ADD CONSTRAINT "ClassRoutine_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
