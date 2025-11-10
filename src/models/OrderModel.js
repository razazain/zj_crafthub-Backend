import mongoose from "mongoose";
import Counter from "./Counter.js";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: Number,
      unique: true, // ensures no duplicates
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],

    shippingAddress: {
      fullName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      email: { type: String, required: true },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },

    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharges: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    paymentScreenshot: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending_verification", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending_verification",
    },
  },
  { timestamps: true }
);

// ✅ Pre-save hook to auto-increment orderNumber
orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { name: "order" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true } // create if doesn't exist
    );
    this.orderNumber = counter.seq;
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
