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
  onBehalfOfGroup: { select: { id: true, name: true } },
  grant: true,
};

const evaluateAutoApproval = async (
  resourceId,
  requestedRoleId,
  durationMinutes,
  resourceRequiredRoleRank,
) => {
  const requestedRole = await prisma.role.findUnique({
    where: { id: requestedRoleId },
  });

  if (requestedRole.rank < resourceRequiredRoleRank) {
    return null;
  }

  const rules = await prisma.policyRule.findMany({
    where: { resourceId, autoApprove: true },
    include: { maxRole: true },
  });

  for (const rule of rules) {
    if (requestedRole.rank > rule.maxRole.rank) continue;

    const condition = rule.condition || {};
    if (condition.maxDuration && durationMinutes > condition.maxDuration)
      continue;

    return rule;
  }

  return null;
};
const requestSubjectFilter = (requesterId, onBehalfOfGroupId) =>
  onBehalfOfGroupId
    ? { onBehalfOfGroupId }
    : { requesterId, onBehalfOfGroupId: null };

const grantSubjectFilter = (requesterId, onBehalfOfGroupId) =>
  onBehalfOfGroupId
    ? { subjectType: "GROUP", groupId: onBehalfOfGroupId }
    : { subjectType: "USER", userId: requesterId };

const findPendingRequest = (requesterId, resourceId, onBehalfOfGroupId) =>
  prisma.accessRequest.findFirst({
    where: {
      resourceId,
      status: "PENDING",
      ...requestSubjectFilter(requesterId, onBehalfOfGroupId),
    },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

// A request may only go through if it raises the subject's rank on this
// resource. Anything at or below a live grant is rejected; the lower grant is
// superseded by supersedeLowerGrants once the higher one is issued.
const findBlockingGrant = (
  requesterId,
  resourceId,
  requestedRank,
  onBehalfOfGroupId,
) =>
  prisma.grant.findFirst({
    where: {
      resourceId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
      role: { rank: { gte: requestedRank } },
      ...grantSubjectFilter(requesterId, onBehalfOfGroupId),
    },
    include: { role: true },
    orderBy: { role: { rank: "desc" } },
  });

const findCurrentRequest = async (
  requesterId,
  resourceId,
  onBehalfOfGroupId,
) => {
  const pending = await findPendingRequest(
    requesterId,
    resourceId,
    onBehalfOfGroupId,
  );

  if (pending) return pending;

  return prisma.accessRequest.findFirst({
    where: {
      resourceId,
      status: "APPROVED",
      grant: { status: "ACTIVE", expiresAt: { gt: new Date() } },
      ...requestSubjectFilter(requesterId, onBehalfOfGroupId),
    },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
};
const supersedeLowerGrants = async (
  { subjectType, userId, groupId },
  resourceId,
  newGrantRoleId,
  newGrantId,
) => {
  const newRole = await prisma.role.findUnique({
    where: { id: newGrantRoleId },
  });

  const subjectFilter =
    subjectType === "GROUP"
      ? { subjectType: "GROUP", groupId }
      : { subjectType: "USER", userId };

  const lowerGrants = await prisma.grant.findMany({
    where: {
      resourceId,
      ...subjectFilter,
      status: "ACTIVE",
      id: { not: newGrantId },
    },
    include: { role: true },
  });

  for (const grant of lowerGrants) {
    if (grant.role.rank <= newRole.rank) {
      await prisma.grant.update({
        where: { id: grant.id },
        data: { status: "REVOKED" },
      });

      await prisma.auditLog.create({
        data: {
          actorId: userId ?? null,
          action: "GRANT_SUPERSEDED",
          resourceId,
          detail: {
            revokedGrantId: grant.id,
            revokedRole: grant.role.name,
            newGrantId,
            newRole: newRole.name,
          },
        },
      });
    }
  }
};

const createAccessRequest = async (req, res) => {
  try {
    const { resourceId, requestedRoleName, reason, durationMinutes, groupId } =
      req.body;

    if (!resourceId || !requestedRoleName || !reason || !durationMinutes) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { requiredRole: true },
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

    let onBehalfOfGroupId = null;

    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      if (group.ownerId !== req.user.id) {
        return res.status(403).json({
          message:
            "Only the group owner can request access on behalf of this group",
        });
      }

      onBehalfOfGroupId = group.id;
    }

    const isOwnerRequest =
      !onBehalfOfGroupId && resource.ownerId === req.user.id;

    const pendingRequest = await findPendingRequest(
      req.user.id,
      resourceId,
      onBehalfOfGroupId,
    );

    if (pendingRequest) {
      return res.status(400).json({
        message: "There is already a pending request for this resource",
        request: pendingRequest,
      });
    }

    const blockingGrant = await findBlockingGrant(
      req.user.id,
      resourceId,
      requestedRole.rank,
      onBehalfOfGroupId,
    );

    if (blockingGrant) {
      const subject = onBehalfOfGroupId
        ? "This group already has"
        : "You already have";

      return res.status(400).json({
        message: `${subject} an active "${blockingGrant.role.name}" grant on this resource — only a higher role can be requested.`,
        grant: blockingGrant,
      });
    }

    const matchingRule = isOwnerRequest
      ? null
      : await evaluateAutoApproval(
          resourceId,
          requestedRole.id,
          durationMinutes,
          resource.requiredRole.rank,
        );

    const autoApprove = isOwnerRequest || !!matchingRule;

    const accessRequest = await prisma.accessRequest.create({
      data: {
        requesterId: req.user.id,
        resourceId,
        requestedRoleId: requestedRole.id,
        reason,
        durationMinutes,
        onBehalfOfGroupId,
        status: autoApprove ? "APPROVED" : "PENDING",
        decidedAt: autoApprove ? new Date() : null,
        approverId: isOwnerRequest ? req.user.id : undefined,
      },
      include: REQUEST_INCLUDE,
    });

    let grant = null;

    const createGrantForRequest = async () => {
      const data = onBehalfOfGroupId
        ? {
            requestId: accessRequest.id,
            subjectType: "GROUP",
            groupId: onBehalfOfGroupId,
            resourceId,
            roleId: requestedRole.id,
            expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
          }
        : {
            requestId: accessRequest.id,
            subjectType: "USER",
            userId: req.user.id,
            resourceId,
            roleId: requestedRole.id,
            expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
          };

      const newGrant = await prisma.grant.create({ data });

      await supersedeLowerGrants(
        onBehalfOfGroupId
          ? {
              subjectType: "GROUP",
              groupId: onBehalfOfGroupId,
              userId: req.user.id,
            }
          : { subjectType: "USER", userId: req.user.id },
        resourceId,
        requestedRole.id,
        newGrant.id,
      );

      return newGrant;
    };

    if (isOwnerRequest) {
      grant = await createGrantForRequest();

      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: "OWNER_ACCESS_REQUEST_AUTO_APPROVED",
          resourceId,
          detail: {
            requestId: accessRequest.id,
            requestedRoleName,
            durationMinutes,
            grantId: grant.id,
          },
        },
      });
    } else if (matchingRule) {
      grant = await createGrantForRequest();

      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: "REQUEST_AUTO_APPROVED",
          resourceId,
          detail: {
            requestId: accessRequest.id,
            requestedRoleName,
            durationMinutes,
            onBehalfOfGroupId: onBehalfOfGroupId ?? undefined,
            policyRuleId: matchingRule.id,
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId: req.user.id,
          type: "REQUEST_AUTO_APPROVED",
          message: `Your request for "${resource.name}" was auto-approved by policy.`,
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
          message: onBehalfOfGroupId
            ? `New access request from ${req.user.username} on behalf of a group for "${resource.name}" needs your approval.`
            : `New access request from ${req.user.username} for "${resource.name}" needs your approval.`,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: "REQUEST_PENDING_APPROVAL",
          resourceId,
          detail: {
            requestId: accessRequest.id,
            requestedRoleName,
            durationMinutes,
            onBehalfOfGroupId: onBehalfOfGroupId ?? undefined,
          },
        },
      });
    }

    res.status(201).json({
      message: isOwnerRequest
        ? "You own this resource — logged"
        : matchingRule
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

const getMyRequestForResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { groupId } = req.query;

    const request = await findCurrentRequest(
      req.user.id,
      resourceId,
      groupId || null,
    );

    res.status(200).json({ request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getPendingRequestsForOwner = async (req, res) => {
  try {
    const requests = await prisma.accessRequest.findMany({
      where: { status: "PENDING", resource: { ownerId: req.user.id } },
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
      include: { resource: true, requester: { select: { username: true } } },
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
      return res.status(403).json({
        message: "Only the resource owner or admin can decide this request",
      });
    }

    if (accessRequest.requesterId === req.user.id) {
      return res
        .status(403)
        .json({ message: "You cannot approve or deny your own request" });
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

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: decision === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_DENIED",
        resourceId: accessRequest.resourceId,
        detail: {
          requestId: accessRequest.id,
          requesterId: accessRequest.requesterId,
          requesterUsername: accessRequest.requester.username,
          requestedRoleId: accessRequest.requestedRoleId,
          onBehalfOfGroupId: updatedRequest.onBehalfOfGroupId ?? undefined,
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: accessRequest.requesterId,
        type: decision === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_DENIED",
        message:
          decision === "APPROVED"
            ? `Your request for "${accessRequest.resource.name}" was approved by ${req.user.username}.`
            : `Your request for "${accessRequest.resource.name}" was denied by ${req.user.username}.`,
      },
    });

    let grant = null;

    if (decision === "APPROVED") {
      const data = updatedRequest.onBehalfOfGroupId
        ? {
            requestId: accessRequest.id,
            subjectType: "GROUP",
            groupId: updatedRequest.onBehalfOfGroupId,
            resourceId: accessRequest.resourceId,
            roleId: accessRequest.requestedRoleId,
            expiresAt: new Date(
              Date.now() + accessRequest.durationMinutes * 60 * 1000,
            ),
          }
        : {
            requestId: accessRequest.id,
            subjectType: "USER",
            userId: accessRequest.requesterId,
            resourceId: accessRequest.resourceId,
            roleId: accessRequest.requestedRoleId,
            expiresAt: new Date(
              Date.now() + accessRequest.durationMinutes * 60 * 1000,
            ),
          };

      grant = await prisma.grant.create({ data });

      await supersedeLowerGrants(
        updatedRequest.onBehalfOfGroupId
          ? {
              subjectType: "GROUP",
              groupId: updatedRequest.onBehalfOfGroupId,
              userId: accessRequest.requesterId,
            }
          : { subjectType: "USER", userId: accessRequest.requesterId },
        accessRequest.resourceId,
        accessRequest.requestedRoleId,
        grant.id,
      );
    }

    res.status(200).json({
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
  supersedeLowerGrants,
  getMyRequestForResource,
  getPendingRequestsForOwner,
  getAllPendingRequests,
  decideRequest,
};
