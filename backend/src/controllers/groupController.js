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
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const group = await prisma.group.create({
      data: {
        name,
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            expiresAt: null,
          },
        },
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

const getMyOwnedGroups = async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: { ownerId: req.user.id },
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

    if (group.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the group owner can add members" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const membership = await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.params.id, userId } },
      update: { expiresAt, status: "ACTIVE" },
      create: { groupId: req.params.id, userId, expiresAt },
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

    if (group.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the group owner can remove members" });
    }

    if (userId === group.ownerId) {
      return res.status(400).json({
        message:
          "The group owner cannot be removed. Transfer ownership first if needed.",
      });
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

    if (newOwnerId === group.ownerId) {
      return res
        .status(400)
        .json({ message: "This user already owns the group" });
    }

    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
    });

    if (!newOwner) {
      return res.status(404).json({ message: "New owner not found" });
    }

    const previousOwner = await prisma.user.findUnique({
      where: { id: group.ownerId },
      select: { username: true },
    });

    const EX_OWNER_MEMBERSHIP_MINUTES = 1440; // 1 day

    const updatedGroup = await prisma.$transaction(async (tx) => {
      // New owner gets (or upgrades to) a permanent membership.
      await tx.groupMember.upsert({
        where: {
          groupId_userId: { groupId: req.params.id, userId: newOwnerId },
        },
        update: { status: "ACTIVE", expiresAt: null },
        create: {
          groupId: req.params.id,
          userId: newOwnerId,
          expiresAt: null,
        },
      });

      // Previous owner is downgraded to a normal, time-boxed member rather
      // than silently keeping a permanent membership forever.
      await tx.groupMember.updateMany({
        where: {
          groupId: req.params.id,
          userId: group.ownerId,
          status: "ACTIVE",
          expiresAt: null,
        },
        data: {
          expiresAt: new Date(
            Date.now() + EX_OWNER_MEMBERSHIP_MINUTES * 60 * 1000,
          ),
        },
      });

      return tx.group.update({
        where: { id: req.params.id },
        data: { ownerId: newOwnerId },
        include: GROUP_INCLUDE,
      });
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "GROUP_OWNERSHIP_TRANSFERRED",
        detail: {
          groupId: req.params.id,
          groupName: group.name,
          previousOwnerId: group.ownerId,
          previousOwnerUsername: previousOwner?.username,
          newOwnerId,
          newOwnerUsername: newOwner.username,
        },
      },
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

const getMyMemberships = async (req, res) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ memberships });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteGroup = async (req, res) => {
  try {
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
        message: "Only the group owner or admin can delete this group",
      });
    }

    const activeGrants = await prisma.grant.count({
      where: { groupId: req.params.id, subjectType: "GROUP", status: "ACTIVE" },
    });

    if (activeGrants > 0) {
      return res.status(400).json({
        message: `Cannot delete this group — it has ${activeGrants} active resource grant(s). Revoke them first.`,
      });
    }

    await prisma.group.delete({ where: { id: req.params.id } });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.ownerId === req.user.id) {
      return res.status(400).json({
        message:
          "The group owner cannot leave. Transfer ownership first if you want to step down.",
      });
    }

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: req.params.id, userId: req.user.id },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ message: "You are not an active member of this group" });
    }

    await prisma.groupMember.update({
      where: { id: membership.id },
      data: { status: "EXPIRED" },
    });

    res.status(200).json({ message: "You have left the group" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createGroup,
  getGroups,
  getMyOwnedGroups,
  getGroupById,
  addMember,
  removeMember,
  transferGroupOwnership,
  getMyMemberships,
  deleteGroup,
  leaveGroup,
};
