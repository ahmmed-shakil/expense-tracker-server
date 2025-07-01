import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../utils/db";
import { createError, asyncHandler } from "../middlewares/error";
import { UpdateProfileInput, ChangePasswordInput } from "../utils/validation";
import bcrypt from "bcryptjs";

export class UserController {
  static getProfile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
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
          _count: {
            select: {
              expenses: true,
            },
          },
        },
      });

      if (!user) {
        throw createError("User not found", 404);
      }

      res.json({
        success: true,
        data: { user },
      });
    }
  );

  static updateProfile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const rawData: UpdateProfileInput = req.body;

      // Filter out empty strings and undefined values
      const updateData: UpdateProfileInput = {};
      if (rawData.name && rawData.name.trim() !== '') {
        updateData.name = rawData.name.trim();
      }
      if (rawData.email && rawData.email.trim() !== '') {
        updateData.email = rawData.email.trim();
      }
      if (rawData.avatar && rawData.avatar.trim() !== '') {
        updateData.avatar = rawData.avatar.trim();
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw createError("User not found", 404);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: { user: updatedUser },
      });
    }
  );

  static deleteAccount = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError("User not found", 404);
      }

      // Soft delete by setting isActive to false
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Account deleted successfully",
      });
    }
  );

  static getUserStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;

      // Get user stats
      const [totalExpenses, totalAmount, categoriesUsed, recentExpenses] =
        await Promise.all([
          // Total expenses count
          prisma.expense.count({
            where: { userId },
          }),

          // Total amount spent
          prisma.expense.aggregate({
            where: { userId },
            _sum: { amount: true },
          }),

          // Categories used count
          prisma.expense.findMany({
            where: { userId },
            select: { categoryId: true },
            distinct: ["categoryId"],
          }),

          // Recent expenses
          prisma.expense.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          }),
        ]);

      const stats = {
        totalExpenses,
        totalAmount: totalAmount._sum.amount || 0,
        categoriesUsed: categoriesUsed.length,
        recentExpenses,
      };

      res.json({
        success: true,
        data: { stats },
      });
    }
  );

  static changePassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const { currentPassword, newPassword }: ChangePasswordInput = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
        },
      });

      if (!user) {
        throw createError("User not found", 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        throw createError("Current password is incorrect", 400);
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    }
  );
}
