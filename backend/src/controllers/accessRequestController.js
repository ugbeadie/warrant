import prisma from "../config/prisma.js";

const REQUEST_INCLUDE = {
  requester: { select: { id: true, username: true, email: true } },
  resource: {
    include: {
      requiredRole: true,
      owner: { select: { id: true, username: true } },
    },
  },
  requestedRole: true,
  approver: { select: { id: true, username: true } },
};

const evaluateAutoApproval = async (
  resourceId,
  requestedRoleId,
  durationMinutes,
) => {
  const rules = await prisma.policyRule.findMany({
    where: { resourceId, autoApprove: true },
    include: { maxRole: true },
  });

  for (const rule of rules) {
    const requestedRole = await prisma.role.findUnique({
      where: { id: requestedRoleId },
    });

    if (requestedRole.rank > rule.maxRole.rank) {
      continue;
    }

    const condition = rule.condition || {};

    if (condition.maxDuration && durationMinutes > condition.maxDuration) {
      continue;
    }

    return rule;
  }

  return null;
};

const createAccessRequest = async (req, res) => {
  try {
    const { resourceId, requestedRoleName, reason, durationMinutes } = req.body;

    if (!resourceId || !requestedRoleName || !reason || !durationMinutes) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const requestedRole = await prisma.role.findUnique({
      where: { name: requestedRoleName },
    });

    if (!requestedRole) {
      return res.status(400).json({ message: "Invalid role name" });
    }

    const matchingRule = await evaluateAutoApproval(
      resourceId,
      requestedRole.id,
      durationMinutes,
    );

    const accessRequest = await prisma.accessRequest.create({
      data: {
        requesterId: req.user.id,
        resourceId,
        requestedRoleId: requestedRole.id,
        reason,
        durationMinutes,
        status: matchingRule ? "APPROVED" : "PENDING",
        decidedAt: matchingRule ? new Date() : null,
      },
      include: REQUEST_INCLUDE,
    });

    let grant = null;

    if (matchingRule) {
      grant = await prisma.grant.create({
        data: {
          requestId: accessRequest.id,
          subjectType: "USER",
          userId: req.user.id,
          resourceId,
          roleId: requestedRole.id,
          expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
        },
      });
    } else {
      const resourceWithOwner = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { owner: { select: { id: true } } },
      });

      await prisma.notification.create({
        data: {
          userId: resourceWithOwner.owner.id,
          type: "REQUEST_PENDING_APPROVAL",
          message: `New access request from ${req.user.username} for "${resource.name}" needs your approval.`,
        },
      });
    }

    res.status(201).json({
      message: matchingRule
        ? "Request auto-approved"
        : "Request submitted for approval",
      request: accessRequest,
      grant,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getPendingRequestsForOwner = async (req, res) => {
  try {
    const requests = await prisma.accessRequest.findMany({
      where: {
        status: "PENDING",
        resource: { ownerId: req.user.id },
      },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllPendingRequests = async (req, res) => {
  try {
    const requests = await prisma.accessRequest.findMany({
      where: { status: "PENDING" },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const decideRequest = async (req, res) => {
  try {
    const { decision } = req.body;

    if (!["APPROVED", "DENIED"].includes(decision)) {
      return res
        .status(400)
        .json({ message: "decision must be APPROVED or DENIED" });
    }

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: req.params.id },
      include: { resource: true },
    });

    if (!accessRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (accessRequest.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "This request has already been decided" });
    }

    const isOwner = accessRequest.resource.ownerId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({
          message: "Only the resource owner or admin can decide this request",
        });
    }

    const updatedRequest = await prisma.accessRequest.update({
      where: { id: req.params.id },
      data: {
        status: decision,
        approverId: req.user.id,
        decidedAt: new Date(),
      },
      include: REQUEST_INCLUDE,
    });

    let grant = null;

    if (decision === "APPROVED") {
      grant = await prisma.grant.create({
        data: {
          requestId: accessRequest.id,
          subjectType: "USER",
          userId: accessRequest.requesterId,
          resourceId: accessRequest.resourceId,
          roleId: accessRequest.requestedRoleId,
          expiresAt: new Date(
            Date.now() + accessRequest.durationMinutes * 60 * 1000,
          ),
        },
      });
    }

    res
      .status(200)
      .json({
        message: `Request ${decision.toLowerCase()}`,
        request: updatedRequest,
        grant,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createAccessRequest,
  getPendingRequestsForOwner,
  getAllPendingRequests,
  decideRequest,
};
