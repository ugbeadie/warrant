/*
  Warnings:

  - You are about to drop the column `isDepartment` on the `Group` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AccessRequest" ADD COLUMN     "onBehalfOfGroupId" TEXT;

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "isDepartment";

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_onBehalfOfGroupId_fkey" FOREIGN KEY ("onBehalfOfGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
