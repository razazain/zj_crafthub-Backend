import User from "../models/UserModel.js";
import Otp from "../models/OtpModel.js";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";
import { generateToken } from "../utils/jwt.js";
import { firebaseAdmin } from '../../firebase.js';


// ======================
// @desc   Google Sign-In
// @route  POST /api/auth/google
// ======================
export const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    // Verify Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    
    if (!decodedToken) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const { uid, email, name, picture, email_verified } = decodedToken;

    // Check if user exists with this social ID
    let user = await User.findOne({ 
      $or: [
        { socialId: uid, authProvider: 'google' },
        { email: email } // Also check by email
      ]
    });

    if (user) {
      // If user exists but signed up with email/password
      if (user.authProvider === 'local') {
        // Check if user wants to link accounts
        // For now, we'll return an error asking to use email login
        return res.status(400).json({ 
          message: 'Account already exists with this email. Please use email/password login.',
          useEmailLogin: true
        });
      }

      // Update user info if changed on Google
      if (user.name !== name || user.profileImage.url !== picture) {
        user.name = name;
        user.profileImage = {
          url: picture || user.profileImage.url,
          alt: name
        };
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name: name || email.split('@')[0],
        email: email,
        socialId: uid,
        authProvider: 'google',
        isVerified: email_verified || true, // Google verified emails are trusted
        phoneNumber: '', // Social login users might add phone later
        profileImage: {
          url: picture || '',
          alt: name || 'Profile Picture'
        },
        // Generate a random password (won't be used for social login)
        password: crypto.randomBytes(16).toString('hex')
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.isVerified,
        profileImage: user.profileImage,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('Google sign-in error:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Google token has expired' });
    }
    
    if (error.code === 'auth/id-token-invalid') {
      return res.status(401).json({ message: 'Invalid Google token' });
    }
    
    res.status(500).json({ 
      message: 'Google authentication failed',
      error: error.message 
    });
  }
};

// ======================
// @desc   Link Google account to existing user
// @route  POST /api/auth/link-google
// @access Private
// ======================
export const linkGoogleAccount = async (req, res) => {
  try {
    const { idToken } = req.body;
    const userId = req.user._id;

    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    // Verify Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // Check if Google email matches user's email
    const user = await User.findById(userId);
    if (user.email !== email) {
      return res.status(400).json({ 
        message: 'Google account email does not match your account email' 
      });
    }

    // Check if Google account is already linked to another user
    const existingLinkedUser = await User.findOne({ 
      socialId: uid, 
      authProvider: 'google' 
    });
    
    if (existingLinkedUser && existingLinkedUser._id.toString() !== userId.toString()) {
      return res.status(400).json({ 
        message: 'This Google account is already linked to another user' 
      });
    }

    // Update user with Google credentials
    user.socialId = uid;
    user.authProvider = 'google';
    user.isVerified = true; // Mark as verified when linked with Google
    await user.save();

    res.status(200).json({
      message: 'Google account linked successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider,
        verified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Link Google error:', error.message);
    res.status(500).json({ 
      message: 'Failed to link Google account',
      error: error.message 
    });
  }
};

// ======================
// @desc   Unlink Google account
// @route  POST /api/auth/unlink-google
// @access Private
// ======================
export const unlinkGoogleAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.authProvider !== 'google') {
      return res.status(400).json({ message: 'Account is not linked to Google' });
    }

    // If user doesn't have a password set, require them to set one first
    if (!user.password) {
      return res.status(400).json({ 
        message: 'Please set a password before unlinking Google account',
        needsPassword: true
      });
    }

    // Verify password if changing from social to local auth
    if (password && !(await user.matchPassword(password))) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Convert to local authentication
    user.socialId = undefined;
    user.authProvider = 'local';
    await user.save();

    res.status(200).json({
      message: 'Google account unlinked successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('Unlink Google error:', error.message);
    res.status(500).json({ 
      message: 'Failed to unlink Google account',
      error: error.message 
    });
  }
};

// ======================
// @desc   Set password for social login user
// @route  POST /api/auth/set-password
// @access Private
// ======================
export const setPasswordForSocialUser = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user._id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: 'Password set successfully',
      user: {
        id: user._id,
        email: user.email,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('Set password error:', error.message);
    res.status(500).json({ 
      message: 'Failed to set password',
      error: error.message 
    });
  }
};






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

    // Check if user uses social login
    if (user.authProvider !== 'local') {
      return res.status(400).json({ 
        message: `Please use ${user.authProvider} login`,
        authProvider: user.authProvider
      });
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
        authProvider: user.authProvider
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