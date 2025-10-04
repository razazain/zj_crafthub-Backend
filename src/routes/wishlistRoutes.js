import express from "express";
import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
  getAllWishlists,
} from "../controllers/wishlistController.js";

import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

// User Routes
router.post("/", protect, addToWishlist);
router.get("/", protect, getMyWishlist);
router.delete("/:productId", protect, removeFromWishlist);

// Admin Route
router.get("/all", protect, adminOnly, getAllWishlists);

export default router;
