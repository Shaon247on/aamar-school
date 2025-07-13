/*
  Warnings:

  - The values [UNIT_TEST,MONTHLY,WEEKLY] on the enum `ExamType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `academicYearId` to the `Exam` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED');

-- AlterEnum
BEGIN;
CREATE TYPE "ExamType_new" AS ENUM ('MIDTERM', 'FINAL', 'QUIZ', 'ASSIGNMENT', 'PROJECT', 'PRESENTATION');
ALTER TABLE "Exam" ALTER COLUMN "examType" TYPE "ExamType_new" USING ("examType"::text::"ExamType_new");
ALTER TYPE "ExamType" RENAME TO "ExamType_old";
ALTER TYPE "ExamType_new" RENAME TO "ExamType";
DROP TYPE "ExamType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "academicYearId" TEXT NOT NULL,
ADD COLUMN     "status" "ExamStatus" DEFAULT 'SCHEDULED';

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
