/*
  Warnings:

  - Made the column `sectionId` on table `ClassRoutine` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ClassRoutine" DROP CONSTRAINT "ClassRoutine_sectionId_fkey";

-- AlterTable
ALTER TABLE "ClassRoutine" ALTER COLUMN "sectionId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ClassRoutine" ADD CONSTRAINT "ClassRoutine_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
