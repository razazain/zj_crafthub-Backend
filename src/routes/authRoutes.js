import express from "express";
import {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMyProfile,
  changePassword,
  changePasswordByAdmin,
  changeUserRole,
  resendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  googleSignIn,
  linkGoogleAccount,
  unlinkGoogleAccount,
  setPasswordForSocialUser

} from '../controllers/authController.js';
import upload from '../middlewares/upload.js';
import { protect, adminOnly } from "../middlewares/authMiddleware.js";




const router = express.Router();

// Social Login Routes
router.post("/google", googleSignIn);
router.post("/link-google", protect, linkGoogleAccount);
router.post("/unlink-google", protect, unlinkGoogleAccount);
router.post("/set-password", protect, setPasswordForSocialUser);

router.post("/register", upload.single("profileImage"), registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/login", loginUser);


// Profile
router.get('/me', protect, getMyProfile);
router.put('/me/change-password', protect, changePassword);
router.put('/change-password/:id', protect, adminOnly, changePasswordByAdmin);
router.put('/change-role/:id', protect, adminOnly, changeUserRole);

// CRUD for users
router.get('/users', protect, adminOnly, getUsers);
router.get('/users/:id', protect, adminOnly, getUserById);
router.put('/users/:id', protect, upload.single('profileImage'), updateUser);
router.delete('/users/:id', protect, adminOnly, deleteUser);
export default router;
