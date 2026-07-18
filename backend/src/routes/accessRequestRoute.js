import express from "express";
import {
  createAccessRequest,
  getPendingRequestsForOwner,
  getAllPendingRequests,
  decideRequest,
} from "../controllers/accessRequestController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/create", protect, createAccessRequest);
router.get("/pending", protect, getPendingRequestsForOwner);
router.get(
  "/pending/all",
  protect,
  authorizeRoles("ADMIN"),
  getAllPendingRequests,
);
router.patch("/:id/decide", protect, decideRequest);

export default router;
