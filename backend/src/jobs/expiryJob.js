import prisma from "../config/prisma.js";

// Status correctness is handled on read by lib/expireIfDue.js, so this job only
// notifies. That means it can run hourly without anything ever being wrong — a
// late notification is a different problem from a stale status.
const WARNING_WINDOW_MINUTES = 60;

let isRunning = false;

// Deduped against the audit log rather than the notification text. Matching on
// a resource name meant a second grant on the same resource never got its own
// notification, and a resource called "API" matched "API Gateway".
const alreadyLogged = async (action, grantId) =>
  Boolean(
    await prisma.auditLog.findFirst({
      where: { action, detail: { path: ["grantId"], equals: grantId } },
    }),
  );

const notifyExpiredGrants = async () => {
  const expiredGrants = await prisma.grant.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRED"] },
      expiresAt: { lte: new Date() },
    },
    include: { resource: true },
  });

  let notified = 0;

  for (const grant of expiredGrants) {
    if (await alreadyLogged("GRANT_EXPIRED", grant.id)) continue;

    await prisma.auditLog.create({
      data: {
        actorId: grant.userId || grant.resource.ownerId,
        action: "GRANT_EXPIRED",
        resourceId: grant.resourceId,
        createdAt: grant.expiresAt,
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

    notified += 1;
  }

  if (notified > 0) {
    console.log(`Notified ${notified} expired grant(s)`);
  }
};

const notifyExpiredMemberships = async () => {
  const expiredMemberships = await prisma.groupMember.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRED"] },
      expiresAt: { not: null, lte: new Date() },
    },
    include: { group: true },
  });

  let notified = 0;

  for (const membership of expiredMemberships) {
    const logged = await prisma.auditLog.findFirst({
      where: {
        action: "GROUP_MEMBERSHIP_EXPIRED",
        detail: { path: ["membershipId"], equals: membership.id },
      },
    });

    if (logged) continue;

    await prisma.auditLog.create({
      data: {
        actorId: membership.userId,
        action: "GROUP_MEMBERSHIP_EXPIRED",
        createdAt: membership.expiresAt,
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

    notified += 1;
  }

  if (notified > 0) {
    console.log(`Notified ${notified} expired membership(s)`);
  }
};

const sendExpiryWarnings = async () => {
  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + WARNING_WINDOW_MINUTES * 60 * 1000,
  );

  const soonToExpire = await prisma.grant.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { gt: now, lte: windowEnd },
    },
    include: { resource: true },
  });

  let warned = 0;

  for (const grant of soonToExpire) {
    if (!grant.userId) continue;
    if (await alreadyLogged("GRANT_EXPIRING_SOON", grant.id)) continue;

    await prisma.auditLog.create({
      data: {
        actorId: grant.userId,
        action: "GRANT_EXPIRING_SOON",
        resourceId: grant.resourceId,
        detail: { grantId: grant.id },
      },
    });

    await prisma.notification.create({
      data: {
        userId: grant.userId,
        type: "GRANT_EXPIRING_SOON",
        message: `Your access to "${grant.resource.name}" expires within the hour.`,
      },
    });

    warned += 1;
  }

  if (warned > 0) {
    console.log(`Warned about ${warned} grant(s) expiring soon`);
  }
};

export const runExpirySweep = async () => {
  if (isRunning) {
    console.log("Expiry sweep already in progress, skipping this run");
    return;
  }

  isRunning = true;

  try {
    await notifyExpiredGrants();
    await notifyExpiredMemberships();
    await sendExpiryWarnings();
  } catch (error) {
    console.error("Expiry job failed:", error.message);
  } finally {
    isRunning = false;
  }
};
