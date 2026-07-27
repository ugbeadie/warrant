import prisma from "../config/prisma.js";

const GRANT_INCLUDE = {
  resource: { include: { owner: { select: { id: true, username: true } } } },
  role: true,
  user: { select: { id: true, username: true } },
  group: { select: { id: true, name: true, ownerId: true } },
  request: { select: { reason: true } },
};

const revokeGrant = async (req, res) => {
  try {
    const grant = await prisma.grant.findUnique({
      where: { id: req.params.id },
      include: GRANT_INCLUDE,
    });

    if (!grant) {
      return res.status(404).json({ message: "Grant not found" });
    }

    if (grant.status !== "ACTIVE" || grant.expiresAt <= new Date()) {
      return res
        .status(400)
        .json({ message: "This grant is not currently active" });
    }

    const isOwner = grant.resource.owner.id === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Only the resource owner or admin can revoke this grant",
      });
    }

    const revokedGrant = await prisma.grant.update({
      where: { id: req.params.id },
      data: { status: "REVOKED" },
      include: GRANT_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "GRANT_REVOKED",
        resourceId: grant.resourceId,
        detail: {
          grantId: grant.id,
          role: grant.role.name,
          subjectType: grant.subjectType,
          subjectUserId:
            grant.subjectType === "USER" ? grant.userId : undefined,
          subjectUsername:
            grant.subjectType === "USER" ? grant.user?.username : undefined,
          groupId: grant.subjectType === "GROUP" ? grant.groupId : undefined,
          groupName:
            grant.subjectType === "GROUP" ? grant.group?.name : undefined,
          revokedByRole: isAdmin && !isOwner ? "ADMIN" : "OWNER",
        },
      },
    });

    if (grant.subjectType === "USER" && grant.userId) {
      await prisma.notification.create({
        data: {
          userId: grant.userId,
          type: "GRANT_REVOKED",
          message: `Your ${grant.role.name} access to "${grant.resource.name}" was revoked by ${req.user.username}.`,
        },
      });
    } else if (grant.subjectType === "GROUP" && grant.groupId) {
      const activeMembers = await prisma.groupMember.findMany({
        where: { groupId: grant.groupId, status: "ACTIVE" },
        select: { userId: true },
      });

      if (activeMembers.length > 0) {
        await prisma.notification.createMany({
          data: activeMembers.map((m) => ({
            userId: m.userId,
            type: "GRANT_REVOKED",
            message: `Your group's ${grant.role.name} access to "${grant.resource.name}" was revoked by ${req.user.username}.`,
          })),
        });
      }
    }

    res
      .status(200)
      .json({ message: "Grant revoked successfully", grant: revokedGrant });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getResourceGrants = async (req, res) => {
  try {
    const grants = await prisma.grant.findMany({
      where: { resourceId: req.params.resourceId },
      include: GRANT_INCLUDE,
      orderBy: { grantedAt: "desc" },
    });

    res.status(200).json({ grants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteGrant = async (req, res) => {
  try {
    const grant = await prisma.grant.findUnique({
      where: { id: req.params.id },
      include: GRANT_INCLUDE,
    });

    if (!grant) {
      return res.status(404).json({ message: "Grant not found" });
    }

    if (grant.status === "ACTIVE") {
      return res
        .status(400)
        .json({ message: "Cannot delete an active grant — revoke it first" });
    }

    const isOwner = grant.resource.owner.id === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Only the resource owner or admin can delete this grant",
      });
    }

    await prisma.grant.delete({ where: { id: req.params.id } });

    res.status(200).json({ message: "Grant deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const surrenderGrant = async (req, res) => {
  try {
    const grant = await prisma.grant.findUnique({
      where: { id: req.params.id },
      include: GRANT_INCLUDE,
    });

    if (!grant) {
      return res.status(404).json({ message: "Grant not found" });
    }

    const isOwnGrant =
      grant.subjectType === "USER" && grant.userId === req.user.id;
    const isGroupOwnerSurrendering =
      grant.subjectType === "GROUP" && grant.group?.ownerId === req.user.id;

    if (!isOwnGrant && !isGroupOwnerSurrendering) {
      return res.status(403).json({
        message:
          "You can only surrender your own grants, or a group grant you own",
      });
    }

    if (grant.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ message: "This grant is not currently active" });
    }

    const updated = await prisma.grant.update({
      where: { id: req.params.id },
      data: { status: "SURRENDERED" },
      include: GRANT_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "GRANT_SURRENDERED",
        resourceId: grant.resourceId,
        detail: {
          grantId: grant.id,
          role: grant.role.name,
          subjectType: grant.subjectType,
          groupId: grant.subjectType === "GROUP" ? grant.groupId : undefined,
        },
      },
    });

    res
      .status(200)
      .json({ message: "Access surrendered successfully", grant: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMyGrants = async (req, res) => {
  try {
    const grants = await prisma.grant.findMany({
      where: { subjectType: "USER", userId: req.user.id },
      include: GRANT_INCLUDE,
      orderBy: { grantedAt: "desc" },
    });

    res.status(200).json({ grants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  revokeGrant,
  getResourceGrants,
  deleteGrant,
  getMyGrants,
  surrenderGrant,
};
