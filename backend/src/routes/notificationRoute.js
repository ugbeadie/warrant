import express from "express";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  setReadStatus,
} from "../controllers/notificationController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.patch("/:id/read", protect, markAsRead);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id", protect, setReadStatus);

export default router;
