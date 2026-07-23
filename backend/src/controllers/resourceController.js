import prisma from "../config/prisma.js";
import checkAccess from "../lib/checkAccess.js";

const RESOURCE_INCLUDE = {
  owner: { select: { id: true, username: true, email: true } },
  requiredRole: true,
};

const createResource = async (req, res) => {
  try {
    const { name, requiredRoleName } = req.body;

    if (!name || !requiredRoleName) {
      return res
        .status(400)
        .json({ message: "name and requiredRoleName are required" });
    }

    const role = await prisma.role.findUnique({
      where: { name: requiredRoleName },
    });

    if (!role) {
      return res.status(400).json({ message: "Invalid role name" });
    }

    const resource = await prisma.resource.create({
      data: {
        name,
        ownerId: req.user.id,
        requiredRoleId: role.id,
      },
      include: RESOURCE_INCLUDE,
    });

    res
      .status(201)
      .json({ message: "Resource created successfully", resource });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getResources = async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      include: RESOURCE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ resources });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMyResources = async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { ownerId: req.user.id },
      include: RESOURCE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ resources });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getResourceById = async (req, res) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: RESOURCE_INCLUDE,
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    res.status(200).json({ resource });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const transferResourceOwnership = async (req, res) => {
  try {
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ message: "newOwnerId is required" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const isOwner = resource.ownerId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Only the current owner or admin can transfer ownership",
      });
    }

    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
    });

    if (!newOwner) {
      return res.status(404).json({ message: "New owner not found" });
    }

    const updatedResource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { ownerId: newOwnerId },
      include: RESOURCE_INCLUDE,
    });

    res.status(200).json({
      message: "Ownership transferred successfully",
      resource: updatedResource,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkResourceAccess = async (req, res) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: { owner: true },
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const result = await checkAccess(req.user.id, req.params.id);

    if (!result.hasAccess) {
      return res.status(403).json({
        message: "Access denied",
        reason: result.reason,
        insufficient: !!result.insufficient,
      });
    }

    res.status(200).json({
      message: "Access granted",
      reason: result.reason,
      source: result.source,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const attemptResourceAccess = async (req, res) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: { owner: true },
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const result = await checkAccess(req.user.id, req.params.id);

    if (!result.hasAccess) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: "ACCESS_ATTEMPT_DENIED",
          resourceId: resource.id,
          detail: { reason: result.reason },
        },
      });

      await prisma.notification.create({
        data: {
          userId: resource.owner.id,
          type: "UNAUTHORIZED_ACCESS_ATTEMPT",
          message: `${req.user.username} attempted to access "${resource.name}" without sufficient permission.`,
        },
      });

      return res
        .status(403)
        .json({ message: "Access denied", reason: result.reason });
    }

    res.status(200).json({
      message: "Access granted",
      reason: result.reason,
      source: result.source,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateResource = async (req, res) => {
  try {
    const { name, requiredRoleName } = req.body;

    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (resource.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the owner can edit this resource" });
    }

    const data = {};

    if (name) {
      data.name = name;
    }

    if (requiredRoleName) {
      const role = await prisma.role.findUnique({
        where: { name: requiredRoleName },
      });
      if (!role) {
        return res.status(400).json({ message: "Invalid role name" });
      }
      data.requiredRoleId = role.id;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updatedResource = await prisma.resource.update({
      where: { id: req.params.id },
      data,
      include: RESOURCE_INCLUDE,
    });

    res.status(200).json({
      message: "Resource updated successfully",
      resource: updatedResource,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteResource = async (req, res) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (resource.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the owner can delete this resource" });
    }

    const activeGrants = await prisma.grant.count({
      where: { resourceId: req.params.id, status: "ACTIVE" },
    });

    if (activeGrants > 0) {
      return res.status(400).json({
        message: `Cannot delete this resource — it has ${activeGrants} active grant(s). Revoke them first.`,
      });
    }

    await prisma.resource.delete({ where: { id: req.params.id } });

    res.status(200).json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMyGroupGrants = async (req, res) => {
  try {
    const now = new Date();

    const activeMemberships = await prisma.groupMember.findMany({
      where: {
        userId: req.user.id,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { groupId: true, group: { select: { id: true, name: true } } },
    });

    if (activeMemberships.length === 0) {
      return res.status(200).json({ grants: [] });
    }

    const groupIds = activeMemberships.map((m) => m.groupId);
    const groupNameById = new Map(
      activeMemberships.map((m) => [m.groupId, m.group.name]),
    );

    const groupGrants = await prisma.grant.findMany({
      where: {
        subjectType: "GROUP",
        groupId: { in: groupIds },
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      include: {
        resource: { select: { id: true, name: true } },
        role: true,
      },
      orderBy: { expiresAt: "asc" },
    });

    const grants = groupGrants.map((g) => ({
      ...g,
      viaGroupName: groupNameById.get(g.groupId) ?? "Unknown group",
    }));

    res.status(200).json({ grants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createResource,
  getResources,
  getMyResources,
  getResourceById,
  transferResourceOwnership,
  checkResourceAccess,
  attemptResourceAccess,
  updateResource,
  deleteResource,
  getMyGroupGrants,
};
