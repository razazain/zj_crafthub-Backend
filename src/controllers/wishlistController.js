import Wishlist from "../models/WishlistModel.js";
import Product from "../models/ProductModel.js";

// ✅ Add to Wishlist
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Add to wishlist (or ignore if already exists)
    const wishlistItem = await Wishlist.findOne({ user: userId, product: productId });
    if (wishlistItem) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    const newWishlistItem = await Wishlist.create({ user: userId, product: productId });

    res.status(201).json({
      success: true,
      message: "Product added to wishlist",
      wishlistItem: newWishlistItem,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get Wishlist for Logged-In User
export const getMyWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ user: req.user._id })
      .populate("product", "name price images status");

    res.json({
      success: true,
      count: wishlist.length,
      wishlist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Remove from Wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const deletedItem = await Wishlist.findOneAndDelete({
      user: req.user._id,
      product: productId,
    });

    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found in wishlist" });
    }

    res.json({ success: true, message: "Item removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ (Optional) Get All Wishlists – Admin Only
export const getAllWishlists = async (req, res) => {
  try {
    const allWishlists = await Wishlist.find()
      .populate("user", "name email")
      .populate("product", "name price");

    res.json({
      success: true,
      count: allWishlists.length,
      wishlists: allWishlists,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

