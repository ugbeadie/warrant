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

  const directGrant = await prisma.grant.findFirst({
    where: {
      resourceId,
      subjectType: "USER",
      userId,
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
    include: { role: true },
  });

  if (directGrant) {
    if (directGrant.role.rank >= resource.requiredRole.rank) {
      await prisma.grant.update({
        where: { id: directGrant.id },
        data: { lastAccessedAt: now },
      });

      return {
        hasAccess: true,
        reason: `Direct grant: you have "${directGrant.role.name}" access to this resource, expiring ${formatExpiry(directGrant.expiresAt)}.`,
        source: "direct",
        grant: directGrant,
      };
    }

    return {
      hasAccess: false,
      reason: `You have a "${directGrant.role.name}" grant on this resource, but it does not meet the required "${resource.requiredRole.name}" level.`,
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
    const groupGrant = await prisma.grant.findFirst({
      where: {
        resourceId,
        subjectType: "GROUP",
        groupId: membership.groupId,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      include: { role: true },
    });

    if (groupGrant) {
      if (groupGrant.role.rank >= resource.requiredRole.rank) {
        await prisma.grant.update({
          where: { id: groupGrant.id },
          data: { lastAccessedAt: now },
        });

        return {
          hasAccess: true,
          reason: `Group grant: you have access via membership in "${membership.group.name}", which has "${groupGrant.role.name}" access to this resource, expiring ${formatExpiry(groupGrant.expiresAt)}.`,
          source: "group",
          group: membership.group,
          grant: groupGrant,
        };
      }

      return {
        hasAccess: false,
        reason: `Your group "${membership.group.name}" has a "${groupGrant.role.name}" grant on this resource, but it does not meet the required "${resource.requiredRole.name}" level.`,
      };
    }
  }

  return {
    hasAccess: false,
    reason: "No active direct or group grant found for this resource.",
  };
};

export default checkAccess;
