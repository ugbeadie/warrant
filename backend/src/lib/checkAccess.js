import prisma from "../config/prisma.js";

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

  if (directGrant && directGrant.role.rank >= resource.requiredRole.rank) {
    return {
      hasAccess: true,
      reason: `Direct grant: you have "${directGrant.role.name}" access to this resource, expiring ${directGrant.expiresAt.toISOString()}.`,
      source: "direct",
      grant: directGrant,
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

    if (groupGrant && groupGrant.role.rank >= resource.requiredRole.rank) {
      return {
        hasAccess: true,
        reason: `Group grant: you have access via membership in "${membership.group.name}", which has "${groupGrant.role.name}" access to this resource, expiring ${groupGrant.expiresAt.toISOString()}.`,
        source: "group",
        group: membership.group,
        grant: groupGrant,
      };
    }
  }

  return {
    hasAccess: false,
    reason:
      "No active direct or group grant found for this resource at a sufficient role level.",
  };
};

export default checkAccess;
