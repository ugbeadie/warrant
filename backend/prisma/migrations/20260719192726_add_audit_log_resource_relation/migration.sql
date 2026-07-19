-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
