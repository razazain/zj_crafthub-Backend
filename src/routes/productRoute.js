import express from 'express';
import upload from '../middlewares/upload.js';
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const router = express.Router();

// Admin-only route for product creation
router.post(
  "/",
  protect,               // must be logged in
  adminOnly,             // must be admin
  upload.array("images", 5), // handle up to 5 images
  createProduct
);
// Get all products
router.get('/category/:categoryId', getProducts);
router.get('/:filter', getProducts);

// Get single product by ID or slug
router.get('/:id', getProductById);

// Update product 
router.put(
  '/:id',
  protect,               
  adminOnly,            
  upload.array('images', 5),
  updateProduct
);

// Delete product (Admin only)
router.delete(
  '/:id',
  protect,               
  adminOnly,             
  deleteProduct
);


export default router;
