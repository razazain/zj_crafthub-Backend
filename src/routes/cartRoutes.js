// src/routes/cartRoutes.js
import express from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getAllCarts,
} from "../controllers/cartController.js";

import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All cart routes need user login
router.post("/", protect, addToCart);
router.get("/", protect, getCart);
router.put("/", protect, updateCartItem);
router.delete("/:productId", protect, removeCartItem);
router.delete("/", protect, clearCart);
router.get("/admin/all", protect, adminOnly, getAllCarts);

export default router;
