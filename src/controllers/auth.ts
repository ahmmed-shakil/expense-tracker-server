import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { AuthUtils } from "../utils/auth";
import { prisma } from "../utils/db";
import { createError, asyncHandler } from "../middlewares/error";
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  VerifyOtpInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "../utils/validation";
import { emailService } from "../services/email";

export class AuthController {
  static register = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { name, email, password }: RegisterInput = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw createError("User with this email already exists", 409);
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const payload = { userId: user.id, email: user.email };
      const accessToken = AuthUtils.generateAccessToken(payload);
      const refreshToken = AuthUtils.generateRefreshToken(payload);

      // Store refresh token
      await AuthUtils.storeRefreshToken(user.id, refreshToken);

      // Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user,
          accessToken,
        },
      });
    }
  );

  static login = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { email, password }: LoginInput = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.isActive) {
        throw createError("Invalid credentials", 401);
      }

      // Verify password
      const isPasswordValid = await AuthUtils.comparePassword(
        password,
        user.password
      );
      if (!isPasswordValid) {
        throw createError("Invalid credentials", 401);
      }

      // Generate tokens
      const payload = { userId: user.id, email: user.email };
      const accessToken = AuthUtils.generateAccessToken(payload);
      const refreshToken = AuthUtils.generateRefreshToken(payload);

      // Store refresh token
      await AuthUtils.storeRefreshToken(user.id, refreshToken);

      // Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            createdAt: user.createdAt,
          },
          accessToken,
        },
      });
    }
  );

  static refreshToken = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw createError("Refresh token not found", 401);
      }

      // Verify refresh token
      const decoded = AuthUtils.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database
      const isTokenValid = await AuthUtils.isRefreshTokenValid(refreshToken);
      if (!isTokenValid) {
        throw createError("Invalid refresh token", 401);
      }

      // Find user
      const user = await prisma.user.findFirst({
        where: {
          id: decoded.userId,
          isActive: true,
        },
      });

      if (!user) {
        throw createError("User not found", 401);
      }

      // Generate new tokens
      const payload = { userId: user.id, email: user.email };
      const newAccessToken = AuthUtils.generateAccessToken(payload);
      const newRefreshToken = AuthUtils.generateRefreshToken(payload);

      // Delete old refresh token and store new one
      await AuthUtils.deleteRefreshToken(refreshToken);
      await AuthUtils.storeRefreshToken(user.id, newRefreshToken);

      // Set new cookies
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: newAccessToken,
        },
      });
    }
  );

  static logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        await AuthUtils.deleteRefreshToken(refreshToken);
      } catch (error) {
        // If refresh token deletion fails, still proceed with logout
        // console.log("Failed to delete refresh token:", error);
      }
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({
      success: true,
      message: "Logout successful",
    });
  });

  static forgotPassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { email }: ForgotPasswordInput = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.isActive) {
        // Don't reveal whether user exists or not
        res.json({
          success: true,
          message:
            "If an account with that email exists, an OTP has been sent to your email.",
        });
        return;
      }

      // Generate OTP
      const otp = AuthUtils.generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

      // Delete any existing password reset records for this user
      await prisma.passwordReset.deleteMany({
        where: {
          userId: user.id,
          used: false,
        },
      });

      // Store OTP
      await prisma.passwordReset.create({
        data: {
          email,
          otp,
          expiresAt,
          userId: user.id,
        },
      });

      try {
        // Send OTP via email
        await emailService.sendOTP(email, otp, user.name);
        // console.log(`OTP sent to ${email}: ${otp}`);
      } catch (error) {
        // console.error("Failed to send OTP email:", error);
        throw createError("Failed to send OTP email. Please try again.", 500);
      }

      res.json({
        success: true,
        message:
          "If an account with that email exists, an OTP has been sent to your email.",
      });
    }
  );

  static verifyOtpAndResetPassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { email, otp, newPassword }: VerifyOtpInput = req.body;

      // Find valid OTP record
      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          email,
          otp,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!resetRecord) {
        throw createError("Invalid or expired OTP", 400);
      }

      // Hash new password
      const hashedPassword = await AuthUtils.hashPassword(newPassword);

      // Update user password
      await prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      });

      // Mark OTP as used
      await prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });

      // Delete all refresh tokens for this user
      await AuthUtils.deleteAllUserRefreshTokens(resetRecord.userId);

      res.json({
        success: true,
        message:
          "Password reset successfully. Please log in with your new password.",
      });
    }
  );

  static resetPassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { token, password }: ResetPasswordInput = req.body;

      // Find valid reset token
      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!resetRecord) {
        throw createError("Invalid or expired reset token", 400);
      }

      // Hash new password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Update user password
      await prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      });

      // Mark reset token as used
      await prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });

      // Delete all refresh tokens for this user
      await AuthUtils.deleteAllUserRefreshTokens(resetRecord.userId);

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    }
  );

  static changePassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { currentPassword, newPassword }: ChangePasswordInput = req.body;
      const userId = req.user!.userId;

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError("User not found", 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthUtils.comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        throw createError("Current password is incorrect", 400);
      }

      // Hash new password
      const hashedNewPassword = await AuthUtils.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      // Delete all refresh tokens for this user
      await AuthUtils.deleteAllUserRefreshTokens(userId);

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Password changed successfully. Please log in again.",
      });
    }
  );

  static me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    res.json({
      success: true,
      data: { user },
    });
  });
}
