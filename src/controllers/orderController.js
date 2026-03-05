import Order from "../models/OrderModel.js";
import Product from "../models/ProductModel.js";
import Cart from "../models/CartModel.js";
import { sendMail } from "../utils/mailer.js";
import User from "../models/UserModel.js";

// 🛒 Create new order
export const createOrder = async (req, res) => {
  try {
    const user = req.user;
    const userId = req.user._id;
    const {
      products,
      subtotal,
      deliveryCharges,
      total,
      fullName,
      phoneNumber,
      email,
      addressLine,
      city,
      state,
      postalCode,
      country,
    } = req.body;

    // parse products if sent as JSON string
    let parsedProducts;
    try {
      parsedProducts = typeof products === "string" ? JSON.parse(products) : products;
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid products format" });
    }

    if (!parsedProducts || !parsedProducts.length) {
      return res.status(400).json({ success: false, message: "Products are required" });
    }

    // ✅ basic validation for shipping address
    if (!fullName || !phoneNumber || !email || !addressLine || !city || !postalCode || !country) {
      return res.status(400).json({ success: false, message: "All required shipping fields must be provided" });
    }

    // ✅ verify each product exists
    for (const item of parsedProducts) {
      const productExists = await Product.findById(item.product);
      if (!productExists) {
        return res.status(400).json({ success: false, message: `Invalid product ID: ${item.product}` });
      }
    }

    // ✅ check for payment screenshot
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Payment screenshot is required" });
    }

    const paymentScreenshot = req.file.path;

    const productDetails = await Promise.all(
      parsedProducts.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          image: product?.images?.[0]?.url,
        };
      })
    );

    // ✅ create order
    const order = await Order.create({
      user: userId,
      products: parsedProducts,
      subtotal,
      deliveryCharges,
      total,
      paymentScreenshot,
      shippingAddress: {
        fullName,
        phoneNumber,
        email,
        addressLine,
        city,
        state,
        postalCode,
        country,
      },
    });

    // ✅ Update cart items status to "ordered" instead of removing them
    const orderedProductIds = parsedProducts.map((item) => item.product);

    const cart = await Cart.findOne({ user: userId });
    
    if (cart) {
      // Update status of ordered items to "ordered"
      cart.items.forEach(item => {
        if (orderedProductIds.includes(item.product.toString())) {
          item.status = "ordered";
          item.statusUpdatedAt = new Date();
        }
      });
      
      // Check if all items are ordered, then update cart status
      const allItemsOrdered = cart.items.every(
        item => item.status === "ordered" || item.status === "product_removed"
      );
      
      if (allItemsOrdered) {
        cart.status = "ordered";
        cart.statusUpdatedAt = new Date();
      }
      
      await cart.save();
    }

    // ✅ Send order confirmation email
    try {
      const productHTML = productDetails
        .map(
          (p) => `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #eee; text-align:left;">
            <img src="${p.image}" alt="${p.name}" width="60" style="border-radius:8px;"/>
          </td>
          <td style="padding:10px; border-bottom:1px solid #eee; text-align:left;">
            <strong>${p.name}</strong><br/>
            Price: Rs. ${p.price.toLocaleString()} <br/>
            Quantity: ${p.quantity}
          </td>
          <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">
            Rs. ${(p.price * p.quantity).toLocaleString()}
          </td>
        </tr>
      `
        )
        .join("");

      const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #d0a19b;">Thank You for Your Order! 🎉</h2>
      <p>Hi <strong>${user.name || fullName}</strong>,</p>
      
      <p>
        We're excited to let you know that your order <strong>#${order.orderNumber}</strong> has been successfully received! 
        Our team is now verifying your payment, and we'll reach out with updates as soon as your order is confirmed.
      </p>

      <h3 style="margin-top: 20px;">🛍️ Order Summary</h3>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background-color:#f6dfd7;">
            <th style="text-align:left; padding:10px;">Product</th>
            <th style="text-align:left; padding:10px;">Details</th>
            <th style="text-align:right; padding:10px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productHTML}
        </tbody>
      </table>

      <p style="margin-top:15px;"><strong>Subtotal:</strong> Rs. ${subtotal.toLocaleString()}</p>
      <p><strong>Delivery Charges:</strong> Rs. ${deliveryCharges.toLocaleString()}</p>
      <p><strong>Total Amount:</strong> Rs. ${total.toLocaleString()}</p>

      <h3 style="margin-top: 20px;">📦 Shipping Address</h3>
      <p>
        ${fullName}<br/>
        ${addressLine}, ${city}, ${state || ""} - ${postalCode}<br/>
        ${country}<br/>
        Phone: ${phoneNumber}
      </p>

      <p style="margin-top: 20px;">
        We truly appreciate your trust in <strong>ZJ CRAFTHUB</strong>. Our team is preparing your order with love and care.
        You'll receive another email once your package is shipped. 💌
      </p>

      <p style="color: #d0a19b; font-weight: bold; margin-top: 30px;">
        — ❤️ The ZJ CRAFTHUB Team
      </p>
    </div>
  `;

      await sendMail({
        to: user.email,
        subject: `We've Received Your Order — #${order.orderNumber}`,
        html: htmlContent,
      });
    } catch (emailError) {
      console.error("Error sending order email:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// 📝 Get all orders (Admin)
export const getOrders = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();

    const orders = await Order.find()
      .populate("user", "name email phoneNumber role profileImage")
      .populate("products.product", "name price images")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalOrders,
      pagination: {
        currentPage: page,
        limit,
        totalPages: Math.ceil(totalOrders / limit),
        hasNextPage: page < Math.ceil(totalOrders / limit),
        hasPrevPage: page > 1,
      },
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 📝 Get single order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phoneNumber role profileImage")
      .populate("products.product", "name price images");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📝 Update order status (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id).populate("user");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const user = order.user;

    // Fetch detailed product info
    const ProductDetails = await Promise.all(
      order.products.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          name: product?.name || "Unknown Product",
          price: product?.price || 0,
          quantity: item.quantity,
          image: product?.images?.[0]?.url,
        };
      })
    );

    console.log("Product Details for Email:", ProductDetails);

    // Update order status
    order.status = status;
    await order.save();

    // ✅ Send Email Notification
    try {
      const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; background: #f9f9f9; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 10px; padding: 30px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
            
            <h2 style="color: #d18479; text-align: center;">Order Status Update</h2>
            
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>We wanted to let you know that the status of your order <strong>#${order.orderNumber}</strong> has been updated to:</p>

            <div style="text-align: center; margin: 20px 0;">
              <span style="background: #d18479; color: #fff; padding: 10px 20px; border-radius: 20px; font-weight: bold; letter-spacing: 1px;">
                ${status.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>

            <h3 style="color: #d18479;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f2e8e6; color: #333;">
                  <th style="padding: 10px; text-align: left;">Product</th>
                  <th style="padding: 10px; text-align: center;">Details</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${ProductDetails.map(
        (p) => `
                          <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;">
                              <img src="${p.image}" alt="${p.name}" width="50" style="vertical-align: middle; border-radius: 6px; margin-right: 10px;">
                            </td>
                            <td style="padding: 10px; text-align: center;">
                              <strong>${p.name}</strong><br/>
                              Price: Rs. ${p.price.toLocaleString()}<br/>
                              Quantity: ${p.quantity}
                            </td>
                            <td style="padding: 10px; text-align: right;">Rs. ${(p.price * p.quantity).toLocaleString()}</td>
                          </tr>
                        `
      ).join("")}
              </tbody>
            </table>

        <p><strong>Subtotal:</strong> Rs. ${order.subtotal.toLocaleString()}</p>
        <p><strong>Delivery Charges:</strong> Rs. ${order.deliveryCharges.toLocaleString()}</p>
        <h3 style="color: #d18479;">Total: Rs. ${order.total.toLocaleString()}</h3>

        <h3 style="color: #d18479;">Shipping Address</h3>
        <p>
          ${order.shippingAddress.fullName}<br/>
          ${order.shippingAddress.addressLine}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}<br/>
          ${order.shippingAddress.country}<br/>
          Phone: ${order.shippingAddress.phoneNumber}
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

        <p>We’ll keep you updated as your order moves through the next stages. Thank you for choosing <strong>ZJ CRAFTHUB</strong> — your support means the world to us!</p>

        <p style="color: #d18479; font-weight: bold; text-align: center; margin-top: 25px;">
          — ❤️ The ZJ CRAFTHUB Team
        </p>

      </div>
    </div>
  `;

      await sendMail({
        to: user.email,
        subject: `Order #${order.orderNumber} — Status Updated to ${status.replace(/_/g, " ").toUpperCase()}`,
        html: htmlContent,
      });

      console.log(`📧 Email sent to ${user.email} for order ${order.orderNumber}`);
    } catch (emailError) {
      console.error("❌ Error sending order status email:", emailError.message);
    }

    res.status(200).json({ success: true, message: "Order status updated and email sent", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🛍 Get orders for logged-in user (My Orders page)
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ user: userId })
      .populate("products.product", "name price images")
      .sort({ createdAt: -1 }); // newest orders first

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Get My Orders Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};