// src/models/CartModel.js
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ["added", "quantity_updated", "product_removed", "ordered"],
      default: "added"
    },
    statusUpdatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one cart per user
    },
    items: [cartItemSchema],
    status: {
      type: String,
      enum: ["active", "cart_cleared", "ordered"],
      default: "active"
    },
    statusUpdatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("Cart", cartSchema);