/*
  Warnings:

  - You are about to drop the column `academicYear` on the `Class` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Class" DROP COLUMN "academicYear",
ADD COLUMN     "academicYearid" TEXT;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_academicYearid_fkey" FOREIGN KEY ("academicYearid") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
