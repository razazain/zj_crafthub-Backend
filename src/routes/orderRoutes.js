import express from "express";
import upload from "../middlewares/upload.js"; // same multer config for single image
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {sendMail} from "../utils/mailer.js";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getMyOrders,
} from "../controllers/orderController.js";

const router = express.Router();
// router.get("/test-email", async (req, res) => {
//   try {
//     await sendMail({
//       to: "zain.raza.1420@gmail.com",
//       subject: "Test Email from Node.js",
//       text: "This is a test email from your Node.js backend.",
//       html: "<h3>This is a test email from your Node.js backend.</h3>",
//     });

//     res.send("Test email sent!");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Failed to send test email.");
//   }
// });


// 👤 User orders
router.get("/my-orders", protect, getMyOrders);

// 🛒 Create order (payment screenshot required)
router.post("/", protect, upload.single("paymentScreenshot"), createOrder);

// 🔒 Admin routes
router.get("/", protect, adminOnly, getOrders);
router.get("/:id", protect, adminOnly, getOrderById);
router.patch("/:id/status", protect, adminOnly, updateOrderStatus);



 
export default router;
  