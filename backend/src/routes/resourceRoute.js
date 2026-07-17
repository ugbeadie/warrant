import express from "express";
import {
  createResource,
  getResources,
  getMyResources,
  getResourceById,
  transferResourceOwnership,
} from "../controllers/resourceController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createResource);
router.get("/all", protect, getResources);
router.get("/my-resources", protect, getMyResources);
router.get("/:id", protect, getResourceById);
router.post("/:id/transfer", protect, transferResourceOwnership);

export default router;
