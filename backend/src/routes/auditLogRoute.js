import express from "express";
import {
  getMyAuditLog,
  getAllAuditLog,
} from "../controllers/auditLogController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/mine", protect, getMyAuditLog);
router.get("/all", protect, authorizeRoles("ADMIN"), getAllAuditLog);

export default router;
