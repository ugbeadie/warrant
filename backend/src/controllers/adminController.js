import prisma from "../config/prisma.js";

const UNUSED_THRESHOLD_DAYS = 7;

const getPlatformStats = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const [
      totalUsers,
      totalResources,
      totalGroups,
      activeGrants,
      pendingRequests,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.resource.count(),
      prisma.group.count(),
      prisma.grant.count({ where: { status: "ACTIVE" } }),
      prisma.accessRequest.count({ where: { status: "PENDING" } }),
    ]);

    const thresholdDate = new Date(
      Date.now() - UNUSED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
    );

    const unusedGrants = await prisma.grant.count({
      where: {
        status: "ACTIVE",
        OR: [
          { lastAccessedAt: { lt: thresholdDate } },
          { lastAccessedAt: null, grantedAt: { lt: thresholdDate } },
        ],
      },
    });

    res.status(200).json({
      totalUsers,
      totalResources,
      totalGroups,
      activeGrants,
      pendingRequests,
      unusedGrants,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUnusedGrantsReport = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const thresholdDate = new Date(
      Date.now() - UNUSED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
    );

    const grants = await prisma.grant.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { lastAccessedAt: { lt: thresholdDate } },
          { lastAccessedAt: null, grantedAt: { lt: thresholdDate } },
        ],
      },
      include: {
        resource: {
          include: { owner: { select: { id: true, username: true } } },
        },
        role: true,
        user: { select: { id: true, username: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { grantedAt: "asc" },
    });

    res.status(200).json({ grants, thresholdDays: UNUSED_THRESHOLD_DAYS });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getPlatformStats, getUnusedGrantsReport };
