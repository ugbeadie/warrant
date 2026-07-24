import prisma from "../config/prisma.js";

const AUDIT_INCLUDE = {
  actor: { select: { id: true, username: true, email: true } },
  resource: { select: { id: true, name: true } },
};

const buildAuditWhere = ({ action, resourceName, actorName }) => {
  const where = {};
  if (action) where.action = action;
  if (resourceName) {
    where.resource = { name: { contains: resourceName, mode: "insensitive" } };
  }
  if (actorName) {
    where.actor = { username: { contains: actorName, mode: "insensitive" } };
  }
  return where;
};

const PAGE_SIZE = 20;

const getMyAuditLog = async (req, res) => {
  try {
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const { action, resourceName, actorName } = req.query;

    const ownedResources = await prisma.resource.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    });
    const ownedResourceIds = ownedResources.map((r) => r.id);

    const where = {
      AND: [
        {
          OR: [
            { actorId: req.user.id },
            { resourceId: { in: ownedResourceIds } },
          ],
        },
        buildAuditWhere({ action, resourceName, actorName }),
      ],
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: AUDIT_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({ entries, total, page, pageSize: PAGE_SIZE });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllAuditLog = async (req, res) => {
  try {
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const { action, resourceName, actorName } = req.query;
    const where = buildAuditWhere({ action, resourceName, actorName });

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: AUDIT_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({ entries, total, page, pageSize: PAGE_SIZE });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getMyAuditLog, getAllAuditLog };
