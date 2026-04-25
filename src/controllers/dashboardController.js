import Product from "../models/ProductModel.js";
import Order from "../models/OrderModel.js";
import User from "../models/UserModel.js";
import Leads from "../models/LeadModel.js   ";

const getMonthRange = (monthsAgo = 0) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - monthsAgo;

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { start, end };
};

const formatChange = (current, previous) => {
  if (!previous) return 0;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change); // round to nearest integer
};

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const { end: endOfPrevMonth } = getMonthRange(1); 

    const totalProducts = await Product.countDocuments({ createdAt: { $lte: now } });
    const totalProductsPrevMonth = await Product.countDocuments({ createdAt: { $lte: endOfPrevMonth } });
    const productsChange = formatChange(totalProducts, totalProductsPrevMonth);

    const totalOrders = await Order.countDocuments({ createdAt: { $lte: now } });
    const totalOrdersPrevMonth = await Order.countDocuments({ createdAt: { $lte: endOfPrevMonth } });
    const ordersChange = formatChange(totalOrders, totalOrdersPrevMonth);

    const totalUsers = await User.countDocuments({ createdAt: { $lte: now } });
    const totalUsersPrevMonth = await User.countDocuments({ createdAt: { $lte: endOfPrevMonth } });
    const usersChange = formatChange(totalUsers, totalUsersPrevMonth);

    const { start: currentMonthStart, end: currentMonthEnd } = getMonthRange(0);
    const { start: prevMonthStart, end: prevMonthEnd } = getMonthRange(1);

    const newLeadsCurrent = await Leads.countDocuments({
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });
    const newLeadsPrev = await Leads.countDocuments({
      createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
    });
    const leadsChange = formatChange(newLeadsCurrent, newLeadsPrev);

    res.json({
      success: true,
      stats: {
        totalProducts: {
          count: totalProducts,
          change: productsChange,
        },
        totalOrders: {
          count: totalOrders,
          change: ordersChange,
        },
        registeredUsers: {
          count: totalUsers,
          change: usersChange,
        },
        newLeads: {
          count: newLeadsCurrent,
          change: leadsChange,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};