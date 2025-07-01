import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../utils/db";
import { createError, asyncHandler } from "../middlewares/error";
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  GetExpensesInput,
} from "../utils/validation";

export class ExpenseController {
  static createExpense = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const {
        amount,
        description,
        notes,
        date,
        categoryId,
      }: CreateExpenseInput = req.body;

      // Check if category exists
      const category = await prisma.category.findFirst({
        where: { id: categoryId, isActive: true },
      });

      if (!category) {
        throw createError("Category not found", 404);
      }

      // Create expense
      const expense = await prisma.expense.create({
        data: {
          amount,
          description,
          notes,
          date: date ? new Date(date) : new Date(),
          userId,
          categoryId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Expense created successfully",
        data: { expense },
      });
    }
  );

  static getExpenses = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const {
        page = 1,
        limit = 10,
        categoryId,
        startDate,
        endDate,
        search,
      }: GetExpensesInput = req.query as any;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { userId };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
        ];
      }

      // Get expenses and total count
      const [expenses, totalCount] = await Promise.all([
        prisma.expense.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: "desc" },
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
        prisma.expense.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          expenses,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    }
  );

  static getExpenseById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const { id } = req.params;

      const expense = await prisma.expense.findFirst({
        where: { id, userId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      if (!expense) {
        throw createError("Expense not found", 404);
      }

      res.json({
        success: true,
        data: { expense },
      });
    }
  );

  static updateExpense = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updateData: UpdateExpenseInput = req.body;

      // Check if expense exists and belongs to user
      const existingExpense = await prisma.expense.findFirst({
        where: { id, userId },
      });

      if (!existingExpense) {
        throw createError("Expense not found", 404);
      }

      // If categoryId is being updated, check if it exists
      if (updateData.categoryId) {
        const category = await prisma.category.findFirst({
          where: { id: updateData.categoryId, isActive: true },
        });

        if (!category) {
          throw createError("Category not found", 404);
        }
      }

      // Update expense
      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          ...updateData,
          date: updateData.date ? new Date(updateData.date) : undefined,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Expense updated successfully",
        data: { expense: updatedExpense },
      });
    }
  );

  static deleteExpense = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const { id } = req.params;

      // Check if expense exists and belongs to user
      const expense = await prisma.expense.findFirst({
        where: { id, userId },
      });

      if (!expense) {
        throw createError("Expense not found", 404);
      }

      // Delete expense
      await prisma.expense.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Expense deleted successfully",
      });
    }
  );

  static getExpenseStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      // Build date filter
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

      const where = {
        userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      };

      // Get various statistics
      const [totalStats, categoryStats, monthlyStats] = await Promise.all([
        // Total amount and count
        prisma.expense.aggregate({
          where,
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true },
        }),

        // Amount by category
        prisma.expense.groupBy({
          by: ["categoryId"],
          where,
          _sum: { amount: true },
          _count: { id: true },
        }),

        // Monthly totals - using proper Prisma queries
        this.getMonthlyStats(userId, startDate as string, endDate as string),
      ]);

      // Get category details for category stats
      const categoryIds = categoryStats.map((stat: any) => stat.categoryId);
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, color: true },
      });

      const categoryStatsWithDetails = categoryStats.map((stat: any) => {
        const category = categories.find((cat) => cat.id === stat.categoryId);
        return {
          ...stat,
          category,
        };
      });

      res.json({
        success: true,
        data: {
          totalStats: {
            totalAmount: totalStats._sum.amount || 0,
            totalCount: totalStats._count.id || 0,
            averageAmount: totalStats._avg.amount || 0,
          },
          categoryStats: categoryStatsWithDetails,
          monthlyStats,
        },
      });
    }
  );

  // Helper method to get monthly statistics
  private static async getMonthlyStats(
    userId: string,
    startDate?: string,
    endDate?: string
  ) {
    // Calculate date range - default to last 12 months if not specified
    const now = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(now.getFullYear() - 1);

    const dateFilter = {
      gte: startDate ? new Date(startDate) : defaultStartDate,
      lte: endDate ? new Date(endDate) : now,
    };

    // Get all expenses within the date range
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: dateFilter,
      },
      select: {
        amount: true,
        date: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Group by month using JavaScript
    const monthlyData: {
      [key: string]: { total_amount: number; expense_count: number };
    } = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total_amount: 0, expense_count: 0 };
      }

      monthlyData[monthKey].total_amount += expense.amount;
      monthlyData[monthKey].expense_count += 1;
    });

    // Convert to array and sort by month (newest first)
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        total_amount: data.total_amount,
        expense_count: data.expense_count,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }
}
