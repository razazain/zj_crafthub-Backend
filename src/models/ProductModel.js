import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: String,
  image: String, // image URL or path
  stock: { type: Number, default: 0 },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
