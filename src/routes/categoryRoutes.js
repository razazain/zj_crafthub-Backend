import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Create category - admin only
router.post("/", protect, adminOnly, createCategory);

// Get all categories
router.get("/", getCategories);

// Get single category by ID or slug
router.get("/:id", getCategoryById);

// Update category - admin only
router.put("/:id", protect, adminOnly, updateCategory);

// Delete category - admin only
router.delete("/:id", protect, adminOnly, deleteCategory);

export default router;
