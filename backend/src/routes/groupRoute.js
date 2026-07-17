import express from "express";
import {
  createGroup,
  getGroups,
  getGroupById,
  addMember,
  removeMember,
} from "../controllers/groupController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createGroup);
router.get("/all", protect, getGroups);
router.get("/:id", protect, getGroupById);
router.post("/:id/add-member", protect, addMember);
router.post("/:id/remove-member", protect, removeMember);

export default router;
