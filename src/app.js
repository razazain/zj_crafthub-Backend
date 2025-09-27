import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
//import productRoutes from "./routes/productRoutes.js"; 

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// API routes
app.use("/api/auth", authRoutes);
//app.use("/api/products", productRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to ZJ Craft Hub API");
});

export default app;
