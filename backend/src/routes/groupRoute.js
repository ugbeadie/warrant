import express from "express";
import {
  createGroup,
  getGroups,
  getMyOwnedGroups,
  getGroupById,
  addMember,
  removeMember,
  transferGroupOwnership,
  getMyMemberships,
  deleteGroup,
} from "../controllers/groupController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createGroup);
router.get("/all", protect, getGroups);
router.get("/mine-owned", protect, getMyOwnedGroups);
router.get("/memberships/mine", protect, getMyMemberships);
router.get("/:id", protect, getGroupById);
router.post("/:id/add-member", protect, addMember);
router.post("/:id/remove-member", protect, removeMember);
router.post("/:id/transfer", protect, transferGroupOwnership);
router.delete("/:id", protect, deleteGroup);

export default router;
