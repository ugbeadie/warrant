import express from "express";
import { searchUsers, getAllUsers } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/search", protect, searchUsers);
router.get("/all", protect, getAllUsers);

export default router;
