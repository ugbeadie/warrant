import prisma from "../config/prisma.js";

const GRANT_INCLUDE = {
  resource: { include: { owner: { select: { id: true, username: true } } } },
  role: true,
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

    if (grant.status !== "ACTIVE") {
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

export { revokeGrant, getResourceGrants, deleteGrant };
