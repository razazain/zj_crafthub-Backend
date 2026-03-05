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
      // New cart with status "active"
      cart = new Cart({ 
        user: userId, 
        items: [{ 
          product: productId, 
          quantity,
          status: "added",
          statusUpdatedAt: new Date()
        }],
        status: "active",
        statusUpdatedAt: new Date()
      });
    } else {
      // Reset cart status to active if it was cleared
      if (cart.status !== "active") {
        cart.status = "active";
        cart.statusUpdatedAt = new Date();
      }

      // ✅ Check if product is already in cart
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.status = "quantity_updated";
        existingItem.statusUpdatedAt = new Date();
      } else {
        cart.items.push({ 
          product: productId, 
          quantity,
          status: "added",
          statusUpdatedAt: new Date()
        });
      }
    }

    await cart.save();

    // Populate product details for response
    await cart.populate("items.product");

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart: {
        ...cart._doc,
        count: cart.items.length
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user cart - filter out items with status "product_removed" and "ordered"
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

    // Filter out items that are "product_removed" or "ordered" for user view
    const visibleItems = cart.items.filter(
      item => !["product_removed", "ordered"].includes(item.status)
    );
    
    const count = visibleItems.length;

    // Create a cart object with filtered items
    const filteredCart = {
      ...cart._doc,
      items: visibleItems,
      count
    };

    res.status(200).json({
      success: true,
      cart: filteredCart,
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
    item.status = "quantity_updated";
    item.statusUpdatedAt = new Date();
    
    // Reset cart status if it was cleared
    if (cart.status !== "active") {
      cart.status = "active";
      cart.statusUpdatedAt = new Date();
    }
    
    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({ 
      success: true, 
      message: "Cart updated", 
      cart: {
        ...cart._doc,
        count: cart.items.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove product from cart - update status to "product_removed" instead of deleting
 */
export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    // Find the item and update its status to "product_removed"
    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (item) {
      item.status = "product_removed";
      item.statusUpdatedAt = new Date();
    }

    await cart.save();
    await cart.populate("items.product");

    // Filter out removed items for response
    const visibleItems = cart.items.filter(
      item => !["product_removed", "ordered"].includes(item.status)
    );

    res.status(200).json({ 
      success: true, 
      message: "Item removed", 
      cart: {
        ...cart._doc,
        items: visibleItems,
        count: visibleItems.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Clear the whole cart - update status to "cart_cleared" instead of deleting items
 */
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    // Update all items status to "product_removed"
    cart.items.forEach(item => {
      item.status = "product_removed";
      item.statusUpdatedAt = new Date();
    });
    
    // Update cart status
    cart.status = "cart_cleared";
    cart.statusUpdatedAt = new Date();
    
    await cart.save();

    res.status(200).json({ 
      success: true, 
      message: "Cart cleared",
      cart: {
        ...cart._doc,
        items: [], // Return empty array for response
        count: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin route to get all carts with pagination and search
 * Shows all items including those with status "product_removed" and "ordered"
 */
export const getAllCarts = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;  
    const limit = Number(req.query.limit) || 10; 
    const skip = (page - 1) * limit;

    const search = req.query.search || "";   // 🔍 search param
    const status = req.query.status || "";   // Filter by cart status
    const itemStatus = req.query.itemStatus || ""; // Filter by item status

    let cartFilter = {};

    // Filter by cart status if provided
    if (status) {
      cartFilter.status = status;
    }

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
      cartFilter.$or = [
        { user: { $in: userIds } },
        { "items.product": { $in: productIds } },
      ];
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

    // If item status filter is provided, filter items in each cart
    if (itemStatus) {
      carts.forEach(cart => {
        cart.items = cart.items.filter(item => item.status === itemStatus);
      });
    }

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