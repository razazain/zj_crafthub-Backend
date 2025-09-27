import Product from '../models/ProductModel.js';

// ✅ Create Product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, tags, isBestSeller, isFeatured, isNewArrival, status } = req.body;

    // Cloudinary images from multer
    const images = req.files.map(file => ({
      url: file.path,
      alt: name,
    }));

    const product = await Product.create({
      name,
      description,
      price,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isBestSeller,
      isFeatured,
      isNewArrival,
      status,
      images,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create product', error: error.message });
  }
};

// ✅ Get All Products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};

// ✅ Get Single Product by ID or Slug
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id) || await Product.findOne({ slug: req.params.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product', error: error.message });
  }
};

// ✅ Update Product
export const updateProduct = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Handle tags
    if (updates.tags) {
      updates.tags = updates.tags.split(',').map(tag => tag.trim());
    }

    // If new images are uploaded
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map(file => ({
        url: file.path,
        alt: updates.name || 'Product image',
      }));
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update product', error: error.message });
  }
};

// ✅ Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
};
