import prisma from "../config/prisma.js";

const RULE_INCLUDE = {
  maxRole: true,
};

const createPolicyRule = async (req, res) => {
  try {
    const { resourceId, condition, autoApprove, maxRoleName } = req.body;

    if (!resourceId || !maxRoleName) {
      return res
        .status(400)
        .json({ message: "resourceId and maxRoleName are required" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const isOwner = resource.ownerId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Only the resource owner or admin can create policy rules",
      });
    }

    const maxRole = await prisma.role.findUnique({
      where: { name: maxRoleName },
    });

    if (!maxRole) {
      return res.status(400).json({ message: "Invalid role name" });
    }

    const rule = await prisma.policyRule.create({
      data: {
        resourceId,
        condition: condition || {},
        autoApprove: !!autoApprove,
        maxRoleId: maxRole.id,
      },
      include: RULE_INCLUDE,
    });

    res.status(201).json({ message: "Policy rule created successfully", rule });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getResourcePolicyRules = async (req, res) => {
  try {
    const rules = await prisma.policyRule.findMany({
      where: { resourceId: req.params.resourceId },
      include: RULE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ rules });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updatePolicyRule = async (req, res) => {
  try {
    const { autoApprove, maxRoleName, condition } = req.body;

    const rule = await prisma.policyRule.findUnique({
      where: { id: req.params.id },
      include: { resource: true },
    });

    if (!rule) {
      return res.status(404).json({ message: "Policy rule not found" });
    }

    const isOwner = rule.resource.ownerId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Only the resource owner or admin can edit policy rules",
      });
    }

    const data = {};

    if (typeof autoApprove === "boolean") {
      data.autoApprove = autoApprove;
    }

    if (condition) {
      data.condition = condition;
    }

    if (maxRoleName) {
      const maxRole = await prisma.role.findUnique({
        where: { name: maxRoleName },
      });
      if (!maxRole) {
        return res.status(400).json({ message: "Invalid role name" });
      }
      data.maxRoleId = maxRole.id;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updated = await prisma.policyRule.update({
      where: { id: req.params.id },
      data,
      include: RULE_INCLUDE,
    });

    res
      .status(200)
      .json({ message: "Policy rule updated successfully", rule: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deletePolicyRule = async (req, res) => {
  try {
    const rule = await prisma.policyRule.findUnique({
      where: { id: req.params.id },
      include: { resource: true },
    });

    if (!rule) {
      return res.status(404).json({ message: "Policy rule not found" });
    }

    const isOwner = rule.resource.ownerId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Only the resource owner or admin can delete policy rules",
      });
    }

    await prisma.policyRule.delete({ where: { id: req.params.id } });

    res.status(200).json({ message: "Policy rule deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createPolicyRule,
  getResourcePolicyRules,
  updatePolicyRule,
  deletePolicyRule,
};
