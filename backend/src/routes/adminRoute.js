import express from "express";
import {
  getPlatformStats,
  getUnusedGrantsReport,
} from "../controllers/adminController.js";
import { getAllUsers } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/stats", protect, getPlatformStats);
router.get("/unused-grants", protect, getUnusedGrantsReport);
router.get("/users", protect, getAllUsers);

export default router;
