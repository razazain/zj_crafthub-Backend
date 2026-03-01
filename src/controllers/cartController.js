// src/controllers/cartController.js
import Cart from "../models/CartModel.js";
import Product from "../models/ProductModel.js";
import User from "../models/UserModel.js";

/**
 * Add or update product in cart
 */
export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id; // from token middleware
    const { productId, quantity } = req.body;

    // ✅ Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // ✅ Find or create cart
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [{ product: productId, quantity }] });
    } else {
      // ✅ Check if product is already in cart
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user cart
 */
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: { items: [], count: 0 },
      });
    }

    const count = cart.items.length;

    res.status(200).json({
      success: true,
      cart: {
        ...cart._doc, // spread all existing cart data
        count,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update quantity of a product
 */
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const item = cart.items.find(
      (i) => i.product.toString() === productId
    );
    if (!item) return res.status(404).json({ success: false, message: "Item not found in cart" });

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({ success: true, message: "Cart updated", cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove product from cart
 */
export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    res.status(200).json({ success: true, message: "Item removed", cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Clear the whole cart
 */
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// admin route to get all carts with pagination and search
export const getAllCarts = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;  
    const limit = Number(req.query.limit) || 10; 
    const skip = (page - 1) * limit;

    const search = req.query.search || "";   // 🔍 search param

    let cartFilter = {};

    // ================================
    // 🔍 SEARCH LOGIC
    // ================================
    if (search) {
      const regex = new RegExp(search, "i"); // case-insensitive

      // 🔍 Search in Users
      const users = await User.find({
        $or: [
          { name: regex },
          { email: regex },
          { phoneNumber: regex },
        ],
      }).select("_id");

      const userIds = users.map((u) => u._id);

      // 🔍 Search in Products
      const products = await Product.find({
        $or: [
          { name: regex },
          { description: regex },
          { tags: regex },
        ],
      }).select("_id");

      const productIds = products.map((p) => p._id);

      // 🔍 Apply filter on Cart
      cartFilter = {
        $or: [
          { user: { $in: userIds } },
          { "items.product": { $in: productIds } },
        ],
      };
    }

    // ================================
    // 📊 TOTAL COUNT (after filter)
    // ================================
    const totalCarts = await Cart.countDocuments(cartFilter);

    // ================================
    // 📦 FETCH CARTS
    // ================================
    const carts = await Cart.find(cartFilter)
      .populate("user", "name email phoneNumber role profileImage")
      .populate("items.product", "name price images status")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalCarts,
      pagination: {
        currentPage: page,
        limit,
        totalPages: Math.ceil(totalCarts / limit),
        hasNextPage: page < Math.ceil(totalCarts / limit),
        hasPrevPage: page > 1,
      },
      carts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};