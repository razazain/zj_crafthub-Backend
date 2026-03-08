import User from "../models/UserModel.js";
import Otp from "../models/OtpModel.js";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";
import { generateToken } from "../utils/jwt.js";





// ======================
// @desc   Register new user
// @route  POST /api/auth/register
// ======================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password || !phoneNumber) {
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
      phoneNumber,
      profileImage,
    });

    const otpCode = Math.floor(100000 + Math.random() * 900000);

    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min expiry
    });

    try {
      await sendMail({
        to: email,
        subject: "Your ZJ CRAFTHUB Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color:#d0a19b;">Hello ${name},</h2>
            <p>Thank you for registering at <strong>ZJ CRAFTHUB</strong>!</p>
            <p>Your one-time verification code is:</p>
            <h1 style="letter-spacing: 5px; color:#d0a19b;">${otpCode}</h1>
            <p>This code is valid for <b>5 minutes</b>.</p>
            <p style="margin-top:20px; font-size:14px; color:#555;">
              If you did not request this code, please ignore this email.
            </p>      
            <p style="margin-top:20px;">— ❤️ The ZJ CRAFTHUB Team</p>
          </div>
        `,
      });
    } catch (error) {
      await User.findByIdAndDelete(user._id);
      await Otp.deleteMany({ email });
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Find OTP record
    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    // Match OTP
    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check expiration
    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email }); // cleanup expired OTPs
      return res.status(400).json({ message: "OTP expired" });
    }

    // Update user verification status
    await User.updateOne({ email }, { isVerified: true });

    // Delete all OTPs for this user
    await Otp.deleteMany({ email });

    return res.json({
      message: "Email verified successfully",
      success: true,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // If already verified -> no need for OTP
    // if (user.isVerified) {
    //   return res.status(400).json({ message: "Email already verified" });
    // }

    // Check if user is requesting OTP too frequently (1 minute cooldown)
    const lastOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (lastOtp) {
      const secondsSinceLastOtp = (Date.now() - lastOtp.createdAt) / 1000;

      if (secondsSinceLastOtp < 60) {
        return res.status(429).json({
          message: `You must wait ${Math.ceil(60 - secondsSinceLastOtp)} seconds before requesting another OTP.`,
        });
      }
    }

    // Delete existing OTPs
    await Otp.deleteMany({ email });

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000);

    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
    });

    // Send email
    await sendMail({
      to: email,
      subject: "Your New Verification Code",
      html: `
        <h2>Your OTP Code</h2>
        <h1>${otpCode}</h1>
        <p>This OTP is valid for <b>5 minutes</b>.</p>
      `,
    });

    return res.json({
      message: "OTP resent successfully.",
      email,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Security: Do not reveal user existence
      return res.json({ message: "If this email exists, OTP has been sent." });
    }

    // Delete previous OTPs
    await Otp.deleteMany({ email });

    const otpCode = Math.floor(100000 + Math.random() * 900000);

    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendMail({
      to: email,
      subject: "Password Reset OTP - ZJ CRAFTHUB",
      html: `
        <h2>Password Reset Request</h2>
        <p>Your OTP for resetting password is:</p>
        <h1>${otpCode}</h1>
        <p>Valid for 5 minutes</p>
      `,
    });

    res.json({ message: "OTP sent to email for password reset" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword; // auto hashed by pre-save
    await user.save();

    await Otp.deleteMany({ email });

    res.json({
      success: true,
      message: "Password reset successfully"
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
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
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
        verified: user.isVerified,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// export const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user || !(await user.matchPassword(password))) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }


//     if (!user.isVerified) {
//       return res.status(400).json({ message: "Please verify your email first" });
//     }

//     const token = generateToken(user._id);

//     res.json({
//       message: "Login successful",
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         verified: user.isVerified,
//         profileImage: user.profileImage,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

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
    const { name, email, phoneNumber, password, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
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
        phoneNumber: user.phoneNumber,
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