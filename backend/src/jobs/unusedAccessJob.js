import prisma from "../config/prisma.js";

const UNUSED_THRESHOLD_DAYS = 3;

const flagUnusedGrants = async () => {
  const now = new Date();
  const thresholdDate = new Date(
    now.getTime() - UNUSED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  );

  const staleGrants = await prisma.grant.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { lastAccessedAt: { lt: thresholdDate } },
        { lastAccessedAt: null, grantedAt: { lt: thresholdDate } },
      ],
    },
    include: { resource: { include: { owner: true } }, role: true },
  });

  for (const grant of staleGrants) {
    const alreadyFlagged = await prisma.auditLog.findFirst({
      where: {
        action: "GRANT_FLAGGED_UNUSED",
        detail: { path: ["grantId"], equals: grant.id },
      },
    });

    if (alreadyFlagged) continue;

    await prisma.auditLog.create({
      data: {
        actorId: grant.resource.owner.id,
        action: "GRANT_FLAGGED_UNUSED",
        resourceId: grant.resourceId,
        detail: {
          grantId: grant.id,
          subjectType: grant.subjectType,
          daysUnused: UNUSED_THRESHOLD_DAYS,
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: grant.resource.owner.id,
        type: "UNUSED_ACCESS_FLAGGED",
        message: `A grant on "${grant.resource.name}" hasn't been used in ${UNUSED_THRESHOLD_DAYS}+ days and may be worth reviewing.`,
      },
    });
    if (grant.subjectType === "USER" && grant.userId) {
      await prisma.notification.create({
        data: {
          userId: grant.userId,
          type: "UNUSED_ACCESS_FLAGGED",
          message: `Your ${grant.role?.name ?? ""} access to "${grant.resource.name}" hasn't been used in ${UNUSED_THRESHOLD_DAYS}+ days.`,
        },
      });
    }
  }

  if (staleGrants.length > 0) {
    console.log(`Flagged ${staleGrants.length} unused grant(s)`);
  }
};

let isRunning = false;

export const runUnusedAccessSweep = async () => {
  if (isRunning) {
    console.log("Unused-access sweep already in progress, skipping this run");
    return;
  }

  isRunning = true;

  try {
    await flagUnusedGrants();
  } catch (error) {
    console.error("Unused-access job failed:", error.message);
  } finally {
    isRunning = false;
  }
};
