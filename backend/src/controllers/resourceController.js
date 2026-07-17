import prisma from "../config/prisma.js";

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
        .json({ message: "name and role name are required" });
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

export {
  createResource,
  getResources,
  getMyResources,
  getResourceById,
  transferResourceOwnership,
};
