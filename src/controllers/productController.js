import mongoose from "mongoose";
import Product from '../models/ProductModel.js';
import Category from '../models/CategoryModel.js';

// =============================================
// ✅ Create Product
// =============================================
export const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      category, 
      tags, 
      isBestSeller, 
      isFeatured, 
      isNewArrival, 
      status 
    } = req.body;

    // ✅ Validate category ID
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
      });
    }

    // ✅ Handle images from multer (Cloudinary)
    const images = req.files?.map(file => ({
      url: file.path,
      alt: name,
    })) || [];

    // ✅ Handle tags
    const formattedTags = tags ? tags.split(',').map(tag => tag.trim()) : [];

    const product = await Product.create({
      name,
      description,
      price,
      category, // Save category as ObjectId
      tags: formattedTags,
      isBestSeller,
      isFeatured,
      isNewArrival,
      status,
      images,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Create Product Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message,
    });
  }
};

// =============================================
// ✅ Get All Products
// =============================================
export const getProducts = async (req, res) => {
  try {
    const { filter, categoryId } = req.params;
    let query = {};

    // If bestseller filter
    if (filter === 'bestseller') {
      query.isBestSeller = true;
    }

    // ✅ Convert categoryId to ObjectId
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.category = new mongoose.Types.ObjectId(categoryId);
    }

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
};



// =============================================
// ✅ Get Single Product by ID or Slug
// =============================================
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate('category', 'name slug')
      || await Product.findOne({ slug: id }).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Get Product Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message,
    });
  }
};

// =============================================
// ✅ Update Product
// =============================================
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // ✅ Validate category if provided
    if (updates.category) {
      const categoryExists = await Category.findById(updates.category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
        });
      }
    }

    // ✅ Handle tags
    if (updates.tags) {
      updates.tags = updates.tags.split(',').map(tag => tag.trim());
    }

    // ✅ Handle new images if uploaded
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map(file => ({
        url: file.path,
        alt: updates.name || 'Product Image',
      }));
    }

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
};

// =============================================
// ✅ Delete Product
// =============================================
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete Product Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
};