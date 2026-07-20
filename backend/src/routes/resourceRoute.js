import express from "express";
import {
  createResource,
  getResources,
  getMyResources,
  getResourceById,
  transferResourceOwnership,
  attemptResourceAccess,
  checkResourceAccess,
  updateResource,
  deleteResource,
} from "../controllers/resourceController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createResource);
router.get("/all", protect, getResources);
router.get("/my-resources", protect, getMyResources);
router.get("/:id", protect, getResourceById);
router.post("/:id/transfer", protect, transferResourceOwnership);
router.get("/:id/access-check", protect, checkResourceAccess);
router.post("/:id/access", protect, attemptResourceAccess);
router.patch("/:id", protect, updateResource);
router.delete("/:id", protect, deleteResource);

export default router;
