import prisma from "../config/prisma.js";

const formatExpiry = (date) => {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const checkAccess = async (userId, resourceId) => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { requiredRole: true },
  });

  if (!resource) {
    return { hasAccess: false, reason: "Resource does not exist" };
  }

  const now = new Date();

  const directGrants = await prisma.grant.findMany({
    where: {
      resourceId,
      subjectType: "USER",
      userId,
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
    include: { role: true },
    orderBy: { role: { rank: "desc" } },
  });

  if (directGrants.length > 0) {
    const bestGrant = directGrants[0];

    if (bestGrant.role.rank >= resource.requiredRole.rank) {
      await prisma.grant.update({
        where: { id: bestGrant.id },
        data: { lastAccessedAt: now },
      });

      return {
        hasAccess: true,
        reason: `Direct grant: you have "${bestGrant.role.name}" access to this resource, expiring ${formatExpiry(bestGrant.expiresAt)}.`,
        source: "direct",
        grant: bestGrant,
      };
    }

    return {
      hasAccess: false,
      insufficient: true,
      reason: `You have a "${bestGrant.role.name}" grant on this resource, but it does not meet the required "${resource.requiredRole.name}" level.`,
      grant: bestGrant,
    };
  }

  const activeMemberships = await prisma.groupMember.findMany({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
    include: { group: true },
  });

  for (const membership of activeMemberships) {
    const groupGrants = await prisma.grant.findMany({
      where: {
        resourceId,
        subjectType: "GROUP",
        groupId: membership.groupId,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      include: { role: true },
      orderBy: { role: { rank: "desc" } },
    });

    if (groupGrants.length > 0) {
      const bestGroupGrant = groupGrants[0];

      if (bestGroupGrant.role.rank >= resource.requiredRole.rank) {
        await prisma.grant.update({
          where: { id: bestGroupGrant.id },
          data: { lastAccessedAt: now },
        });

        return {
          hasAccess: true,
          reason: `Group grant: you have access via membership in "${membership.group.name}", which has "${bestGroupGrant.role.name}" access to this resource, expiring ${formatExpiry(bestGroupGrant.expiresAt)}.`,
          source: "group",
          group: membership.group,
          grant: bestGroupGrant,
        };
      }

      return {
        hasAccess: false,
        insufficient: true,
        reason: `Your group "${membership.group.name}" has a "${bestGroupGrant.role.name}" grant on this resource, but it does not meet the required "${resource.requiredRole.name}" level.`,
        group: membership.group,
        grant: bestGroupGrant,
      };
    }
  }

  return {
    hasAccess: false,
    reason: "No active direct or group grant found for this resource.",
  };
};

export default checkAccess;
