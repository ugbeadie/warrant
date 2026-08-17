import prisma from "../config/prisma.js";

let isRunning = false;

const sweepExpiredGrants = async () => {
  const now = new Date();

  const expiredGrants = await prisma.grant.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    include: { resource: true },
  });

  for (const grant of expiredGrants) {
    await prisma.grant.update({
      where: { id: grant.id },
      data: { status: "EXPIRED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: grant.userId || grant.resource.ownerId,
        action: "GRANT_EXPIRED",
        resourceId: grant.resourceId,
        detail: { grantId: grant.id, subjectType: grant.subjectType },
      },
    });

    if (grant.userId) {
      await prisma.notification.create({
        data: {
          userId: grant.userId,
          type: "GRANT_EXPIRED",
          message: `Your access to "${grant.resource.name}" has expired.`,
        },
      });
    }
  }

  if (expiredGrants.length > 0) {
    console.log(`Expired ${expiredGrants.length} grant(s)`);
  }
};

const sweepExpiredMemberships = async () => {
  const now = new Date();
  const expiredMemberships = await prisma.groupMember.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { not: null, lte: now },
    },
    include: { group: true },
  });

  for (const membership of expiredMemberships) {
    await prisma.groupMember.update({
      where: { id: membership.id },
      data: { status: "EXPIRED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: membership.userId,
        action: "GROUP_MEMBERSHIP_EXPIRED",
        detail: { groupId: membership.groupId, membershipId: membership.id },
      },
    });

    await prisma.notification.create({
      data: {
        userId: membership.userId,
        type: "MEMBERSHIP_EXPIRED",
        message: `Your membership in "${membership.group.name}" has expired.`,
      },
    });
  }

  if (expiredMemberships.length > 0) {
    console.log(`Expired ${expiredMemberships.length} group membership(s)`);
  }
};

const sendExpiryWarnings = async () => {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const soonToExpire = await prisma.grant.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { gt: now, lte: fiveMinutesFromNow },
    },
    include: { resource: true },
  });

  for (const grant of soonToExpire) {
    if (!grant.userId) continue;

    const alreadyWarned = await prisma.notification.findFirst({
      where: {
        userId: grant.userId,
        type: "GRANT_EXPIRING_SOON",
        message: { contains: grant.resource.name },
      },
    });

    if (alreadyWarned) continue;

    await prisma.notification.create({
      data: {
        userId: grant.userId,
        type: "GRANT_EXPIRING_SOON",
        message: `Your access to "${grant.resource.name}" expires in 5 minutes.`,
      },
    });
  }
};

export const runExpirySweep = async () => {
  if (isRunning) {
    console.log("Expiry sweep already in progress, skipping this run");
    return;
  }

  isRunning = true;

  try {
    await sweepExpiredGrants();
    await sweepExpiredMemberships();
    await sendExpiryWarnings();
  } catch (error) {
    console.error("Expiry job failed:", error.message);
  } finally {
    isRunning = false;
  }
};
