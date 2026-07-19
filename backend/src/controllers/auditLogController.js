import prisma from "../config/prisma.js";

const AUDIT_INCLUDE = {
  actor: { select: { id: true, username: true, email: true } },
  resource: { select: { id: true, name: true } },
};

const getMyAuditLog = async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const ownedResources = await prisma.resource.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    });

    const ownedResourceIds = ownedResources.map((r) => r.id);

    const entries = await prisma.auditLog.findMany({
      where: {
        OR: [
          { actorId: req.user.id },
          { resourceId: { in: ownedResourceIds } },
        ],
      },
      include: AUDIT_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.status(200).json({ entries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllAuditLog = async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const { action, resourceId } = req.query;

    const where = {};
    if (action) where.action = action;
    if (resourceId) where.resourceId = resourceId;

    const entries = await prisma.auditLog.findMany({
      where,
      include: AUDIT_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.status(200).json({ entries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getMyAuditLog, getAllAuditLog };
