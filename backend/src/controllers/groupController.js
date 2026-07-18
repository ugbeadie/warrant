import prisma from "../config/prisma.js";

const GROUP_INCLUDE = {
  owner: { select: { id: true, username: true, email: true } },
  members: {
    where: { status: "ACTIVE" },
    include: { user: { select: { id: true, username: true, email: true } } },
  },
};

const createGroup = async (req, res) => {
  try {
    const { name, isDepartment } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const wantsDepartment = !!isDepartment;
    const isAdmin = req.user.role === "ADMIN";

    if (wantsDepartment && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Only an admin can create a department" });
    }

    const group = await prisma.group.create({
      data: {
        name,
        isDepartment: wantsDepartment,
        ownerId: req.user.id,
      },
      include: GROUP_INCLUDE,
    });

    res.status(201).json({ message: "Group created successfully", group });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getGroups = async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      include: GROUP_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getGroupById = async (req, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: GROUP_INCLUDE,
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json({ group });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addMember = async (req, res) => {
  try {
    const { userId, durationMinutes } = req.body;

    if (!userId || !durationMinutes) {
      return res
        .status(400)
        .json({ message: "userId and durationMinutes are required" });
    }

    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isOwner = group.ownerId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Only the group owner or admin can add members" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const membership = await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.params.id, userId } },
      update: { expiresAt, status: "ACTIVE" },
      create: {
        groupId: req.params.id,
        userId,
        expiresAt,
      },
    });

    res.status(200).json({ message: "Member added successfully", membership });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const removeMember = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isOwner = group.ownerId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Only the group owner or admin can remove members" });
    }

    await prisma.groupMember.updateMany({
      where: { groupId: req.params.id, userId, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    });

    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const transferGroupOwnership = async (req, res) => {
  try {
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ message: "newOwnerId is required" });
    }

    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isOwner = group.ownerId === req.user.id;
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

    const updatedGroup = await prisma.group.update({
      where: { id: req.params.id },
      data: { ownerId: newOwnerId },
      include: GROUP_INCLUDE,
    });

    res.status(200).json({
      message: "Ownership transferred successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createGroup,
  getGroups,
  getGroupById,
  addMember,
  removeMember,
  transferGroupOwnership,
};
