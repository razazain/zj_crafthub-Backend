import express from "express";
import upload from "../middlewares/upload.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  getProducts,
  getProductsByCategory,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

const router = express.Router();

// 🧩 Admin-only: Create new product
router.post(
  "/",
  protect,
  adminOnly,
  upload.array("images", 5),
  createProduct
);

// 🛍 Public routes
router.get("/", getProducts);                      // Get all products
router.get("/category/:categoryId", getProductsByCategory); // Get products by category ID
router.get("/filter/:filter", getProducts);        // Get products by filter (bestseller, featured, etc.)
router.get("/:id", getProductById);                // Get single product by ID or slug

// ✏️ Admin routes (update/delete)
router.put(
  "/:id",
  protect,
  adminOnly,
  upload.array("images", 5),
  updateProduct
);

router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;
