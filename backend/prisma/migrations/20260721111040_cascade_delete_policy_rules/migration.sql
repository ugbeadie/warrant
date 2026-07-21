-- DropForeignKey
ALTER TABLE "PolicyRule" DROP CONSTRAINT "PolicyRule_resourceId_fkey";

-- AddForeignKey
ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
