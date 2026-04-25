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

// ✅ Get All Wishlists – Admin Only
export const getAllWishlists = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const matchStage = search
      ? {
          $or: [
            { "user.name": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
            { "product.name": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const wishlistData = await Wishlist.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      { $match: matchStage },

      {
        $project: {
          user: {
            _id: "$user._id",
            name: "$user.name",
            email: "$user.email",
            profileImage: "$user.profileImage",
          },
          product: {
            _id: "$product._id",
            name: "$product.name",
            price: "$product.price",
            images: "$product.images",
          },
          createdAt: 1,
        },
      },

      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const wishlists = wishlistData[0].data;
    const total = wishlistData[0].totalCount[0]
      ? wishlistData[0].totalCount[0].count
      : 0;

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      wishlists,
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

