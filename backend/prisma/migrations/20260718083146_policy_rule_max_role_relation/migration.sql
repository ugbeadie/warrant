-- AddForeignKey
ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_maxRoleId_fkey" FOREIGN KEY ("maxRoleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
