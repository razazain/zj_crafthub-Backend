import User from "../models/UserModel.js";
import { generateToken } from "../utils/jwt.js";

// ======================
// @desc   Register new user
// @route  POST /api/auth/register
// ======================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    // ✅ Check if user exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Handle profile image
    const profileImage = req.file
      ? { url: req.file.path, alt: name }
      : { url: "", alt: "Profile Picture" };

    const user = await User.create({
      name,
      email,
      password,
      profileImage,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Login user
// @route  POST /api/auth/login
// ======================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Get all users
// @route  GET /api/users
// ======================
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Get user by ID
// @route  GET /api/users/:id
// ======================
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Update user profile
// @route  PUT /api/users/:id
// ======================
export const updateUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (password) user.password = password; // will be hashed by pre('save')

    // ✅ Handle profile image
    if (req.file) {
      user.profileImage = { url: req.file.path, alt: name || user.name };
    }

    await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Delete user
// @route  DELETE /api/users/:id
// ======================
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Get logged-in user's profile
// @route  GET /api/auth/profile
// ======================
export const getMyProfile = async (req, res) => {
  try {
    // req.user is attached by protect middleware
    res.json({
      success: true,
      user: req.user, // already without password
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Change password 
// @route  PUT /api/auth/change-password
// ======================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Change password by Admin
// @route  PUT /api/users/:id/change-password
// ====================== 
export const changePasswordByAdmin = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: `Password changed for ${user.email}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================
// @desc   Change user role (admin/customer)
// @route  PUT /api/users/:id/role
// ======================
export const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'customer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};