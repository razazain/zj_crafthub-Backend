import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/stats", protect, adminOnly, getDashboardStats);

export default router;
