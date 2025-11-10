import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "order"
  seq: { type: Number, default: 1000 }, // start number
});

const Counter = mongoose.model("Counter", counterSchema);
export default Counter;
