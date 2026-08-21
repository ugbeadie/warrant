import prisma from "../config/prisma.js";

// Correctness lives here rather than in the sweep. A grant that expired an hour
// ago and nobody has looked at does not need its row updated; reading it is the
// moment it matters, so that is when it gets fixed. Guarded on status so two
// simultaneous readers cannot both act on the same row.
export const expireGrantsWhere = async (where) => {
  await prisma.grant.updateMany({
    where: {
      ...where,
      status: "ACTIVE",
      expiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });
};

export const expireMembershipsForUser = async (userId) => {
  await prisma.groupMember.updateMany({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { not: null, lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });
};
