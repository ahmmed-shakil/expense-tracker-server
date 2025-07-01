import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../utils/db";
import { createError, asyncHandler } from "../middlewares/error";
import { CreateCategoryInput, UpdateCategoryInput } from "../utils/validation";

export class CategoryController {
  static createCategory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { name, description, color }: CreateCategoryInput = req.body;

      // Check if category with same name already exists
      const existingCategory = await prisma.category.findUnique({
        where: { name },
      });

      if (existingCategory) {
        throw createError("Category with this name already exists", 409);
      }

      // Create category
      const category = await prisma.category.create({
        data: {
          name,
          description,
          color: color || "#1890ff",
        },
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    }
  );

  static getCategories = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { includeInactive } = req.query;

      const where = includeInactive === "true" ? {} : { isActive: true };

      const categories = await prisma.category.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              expenses: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: categories,
      });
    }
  );

  static getCategoryById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              expenses: true,
            },
          },
        },
      });

      if (!category) {
        throw createError("Category not found", 404);
      }

      res.json({
        success: true,
        data: category,
      });
    }
  );

  static updateCategory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const updateData: UpdateCategoryInput = req.body;

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        throw createError("Category not found", 404);
      }

      // If name is being updated, check for duplicates
      if (updateData.name && updateData.name !== existingCategory.name) {
        const duplicateCategory = await prisma.category.findUnique({
          where: { name: updateData.name },
        });

        if (duplicateCategory) {
          throw createError("Category with this name already exists", 409);
        }
      }

      // Update category
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              expenses: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Category updated successfully",
        data: updatedCategory,
      });
    }
  );

  static deleteCategory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              expenses: true,
            },
          },
        },
      });

      if (!category) {
        throw createError("Category not found", 404);
      }

      // Check if category has expenses
      if (category._count.expenses > 0) {
        // Soft delete by setting isActive to false
        await prisma.category.update({
          where: { id },
          data: { isActive: false },
        });

        res.json({
          success: true,
          message:
            "Category deactivated successfully (has associated expenses)",
        });
      } else {
        // Hard delete if no expenses
        await prisma.category.delete({
          where: { id },
        });

        res.json({
          success: true,
          message: "Category deleted successfully",
        });
      }
    }
  );

  static getCategoryStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id },
      });

      if (!category) {
        throw createError("Category not found", 404);
      }

      // Build date filter
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

      const where = {
        categoryId: id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      };

      // Get category statistics
      const [stats, recentExpenses] = await Promise.all([
        prisma.expense.aggregate({
          where,
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true },
        }),
        prisma.expense.findMany({
          where: { categoryId: id },
          orderBy: { date: "desc" },
          take: 10,
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          category,
          stats: {
            totalAmount: stats._sum.amount || 0,
            totalCount: stats._count.id || 0,
            averageAmount: stats._avg.amount || 0,
          },
          recentExpenses,
        },
      });
    }
  );
}
