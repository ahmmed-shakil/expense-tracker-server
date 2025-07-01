import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../utils/db";
import { createError, asyncHandler } from "../middlewares/error";
import { CreateBudgetInput, UpdateBudgetInput } from "../utils/validation";

export class BudgetController {
  static createBudget = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const {
        name,
        amount,
        startDate,
        endDate,
        categoryId,
      }: CreateBudgetInput = req.body;
      const userId = req.user!.userId;

      const budget = await prisma.budget.create({
        data: {
          name,
          amount,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          categoryId,
          userId,
        },
        include: {
          category: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Budget created successfully",
        data: budget,
      });
    }
  );

  static getBudgets = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const { isActive } = req.query;

      const where: any = { userId };
      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      const budgets = await prisma.budget.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate spent amount for each budget with overlap handling
      const budgetsWithSpent = await Promise.all(
        budgets.map(async (budget) => {
          // Get all expenses for this budget period and category
          const expenseWhere: any = {
            userId,
            date: {
              gte: budget.startDate,
              lte: budget.endDate,
            },
          };

          // If budget has a specific category, filter by it
          if (budget.categoryId) {
            expenseWhere.categoryId = budget.categoryId;
          }

          // Get expenses for this budget
          const expenses = await prisma.expense.findMany({
            where: expenseWhere,
            select: {
              id: true,
              amount: true,
              date: true,
              categoryId: true,
            },
          });

          // Find overlapping budgets for the same category
          const overlappingBudgets = budgets.filter(
            (b) =>
              b.id !== budget.id &&
              b.categoryId === budget.categoryId &&
              b.startDate <= budget.endDate &&
              b.endDate >= budget.startDate
          );

          let totalSpent = 0;

          // If no overlapping budgets, use simple sum
          if (overlappingBudgets.length === 0) {
            totalSpent = expenses.reduce(
              (sum, expense) => sum + expense.amount,
              0
            );
          } else {
            // Calculate proportional spending for overlapping budgets
            totalSpent = expenses.reduce((sum, expense) => {
              const expenseDate = new Date(expense.date);

              // Find all budgets that cover this expense date
              const coveringBudgets = [budget, ...overlappingBudgets].filter(
                (b) =>
                  new Date(b.startDate) <= expenseDate &&
                  new Date(b.endDate) >= expenseDate
              );

              if (coveringBudgets.length === 1) {
                // Only this budget covers the expense
                return sum + expense.amount;
              } else {
                // Multiple budgets cover this expense - distribute proportionally by budget amount
                const totalBudgetAmount = coveringBudgets.reduce(
                  (total, b) => total + b.amount,
                  0
                );
                const proportion = budget.amount / totalBudgetAmount;
                return sum + expense.amount * proportion;
              }
            }, 0);
          }

          return {
            ...budget,
            spent: Math.round(totalSpent * 100) / 100, // Round to 2 decimal places
          };
        })
      );

      res.json({
        success: true,
        data: budgetsWithSpent,
      });
    }
  );

  static getBudgetById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.userId;

      const budget = await prisma.budget.findFirst({
        where: { id, userId },
        include: {
          category: true,
        },
      });

      if (!budget) {
        throw createError("Budget not found", 404);
      }

      res.json({
        success: true,
        data: budget,
      });
    }
  );

  static updateBudget = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.userId;
      const updateData: UpdateBudgetInput = req.body;

      const existingBudget = await prisma.budget.findFirst({
        where: { id, userId },
      });

      if (!existingBudget) {
        throw createError("Budget not found", 404);
      }

      const updatedBudget = await prisma.budget.update({
        where: { id },
        data: {
          ...updateData,
          startDate: updateData.startDate
            ? new Date(updateData.startDate)
            : undefined,
          endDate: updateData.endDate
            ? new Date(updateData.endDate)
            : undefined,
        },
        include: {
          category: true,
        },
      });

      res.json({
        success: true,
        message: "Budget updated successfully",
        data: updatedBudget,
      });
    }
  );

  static deleteBudget = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.userId;

      const budget = await prisma.budget.findFirst({
        where: { id, userId },
      });

      if (!budget) {
        throw createError("Budget not found", 404);
      }

      await prisma.budget.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Budget deleted successfully",
      });
    }
  );

  static getBudgetProgress = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.userId;

      const budget = await prisma.budget.findFirst({
        where: { id, userId },
        include: {
          category: true,
        },
      });

      if (!budget) {
        throw createError("Budget not found", 404);
      }

      // Get all budgets for overlap calculation
      const allBudgets = await prisma.budget.findMany({
        where: { userId },
        select: {
          id: true,
          amount: true,
          startDate: true,
          endDate: true,
          categoryId: true,
        },
      });

      // Get expenses for this budget period and category
      const expenseWhere: any = {
        userId,
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      };

      if (budget.categoryId) {
        expenseWhere.categoryId = budget.categoryId;
      }

      const expenses = await prisma.expense.findMany({
        where: expenseWhere,
        select: {
          id: true,
          amount: true,
          date: true,
          categoryId: true,
        },
      });

      // Find overlapping budgets for the same category
      const overlappingBudgets = allBudgets.filter(
        (b) =>
          b.id !== budget.id &&
          b.categoryId === budget.categoryId &&
          b.startDate <= budget.endDate &&
          b.endDate >= budget.startDate
      );

      let spentAmount = 0;

      // If no overlapping budgets, use simple sum
      if (overlappingBudgets.length === 0) {
        spentAmount = expenses.reduce(
          (sum, expense) => sum + expense.amount,
          0
        );
      } else {
        // Calculate proportional spending for overlapping budgets
        spentAmount = expenses.reduce((sum, expense) => {
          const expenseDate = new Date(expense.date);

          // Find all budgets that cover this expense date
          const coveringBudgets = [budget, ...overlappingBudgets].filter(
            (b) =>
              new Date(b.startDate) <= expenseDate &&
              new Date(b.endDate) >= expenseDate
          );

          if (coveringBudgets.length === 1) {
            // Only this budget covers the expense
            return sum + expense.amount;
          } else {
            // Multiple budgets cover this expense - distribute proportionally by budget amount
            const totalBudgetAmount = coveringBudgets.reduce(
              (total, b) => total + b.amount,
              0
            );
            const proportion = budget.amount / totalBudgetAmount;
            return sum + expense.amount * proportion;
          }
        }, 0);
      }

      // Round to 2 decimal places
      spentAmount = Math.round(spentAmount * 100) / 100;
      const remainingAmount = budget.amount - spentAmount;
      const percentageUsed = (spentAmount / budget.amount) * 100;

      res.json({
        success: true,
        data: {
          budget,
          spentAmount,
          remainingAmount,
          percentageUsed: Math.round(percentageUsed * 100) / 100,
          isOverBudget: spentAmount > budget.amount,
        },
      });
    }
  );

  static getBudgetAlerts = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;

      const activeBudgets = await prisma.budget.findMany({
        where: {
          userId,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        include: {
          category: true,
        },
      });

      // Get all budgets for overlap calculation
      const allBudgets = await prisma.budget.findMany({
        where: { userId },
        select: {
          id: true,
          amount: true,
          startDate: true,
          endDate: true,
          categoryId: true,
        },
      });

      const alerts = [];

      for (const budget of activeBudgets) {
        // Get expenses for this budget period and category
        const expenseWhere: any = {
          userId,
          date: {
            gte: budget.startDate,
            lte: budget.endDate,
          },
        };

        if (budget.categoryId) {
          expenseWhere.categoryId = budget.categoryId;
        }

        const expenses = await prisma.expense.findMany({
          where: expenseWhere,
          select: {
            id: true,
            amount: true,
            date: true,
            categoryId: true,
          },
        });

        // Find overlapping budgets for the same category
        const overlappingBudgets = allBudgets.filter(
          (b) =>
            b.id !== budget.id &&
            b.categoryId === budget.categoryId &&
            b.startDate <= budget.endDate &&
            b.endDate >= budget.startDate
        );

        let spentAmount = 0;

        // If no overlapping budgets, use simple sum
        if (overlappingBudgets.length === 0) {
          spentAmount = expenses.reduce(
            (sum, expense) => sum + expense.amount,
            0
          );
        } else {
          // Calculate proportional spending for overlapping budgets
          spentAmount = expenses.reduce((sum, expense) => {
            const expenseDate = new Date(expense.date);

            // Find all budgets that cover this expense date
            const coveringBudgets = [budget, ...overlappingBudgets].filter(
              (b) =>
                new Date(b.startDate) <= expenseDate &&
                new Date(b.endDate) >= expenseDate
            );

            if (coveringBudgets.length === 1) {
              // Only this budget covers the expense
              return sum + expense.amount;
            } else {
              // Multiple budgets cover this expense - distribute proportionally by budget amount
              const totalBudgetAmount = coveringBudgets.reduce(
                (total, b) => total + b.amount,
                0
              );
              const proportion = budget.amount / totalBudgetAmount;
              return sum + expense.amount * proportion;
            }
          }, 0);
        }

        // Round to 2 decimal places
        spentAmount = Math.round(spentAmount * 100) / 100;
        const percentageUsed = (spentAmount / budget.amount) * 100;

        if (percentageUsed >= 80) {
          // Alert if 80% or more of budget is used
          alerts.push({
            budget,
            spentAmount,
            percentageUsed: Math.round(percentageUsed * 100) / 100,
            isOverBudget: spentAmount > budget.amount,
            severity:
              spentAmount > budget.amount
                ? "critical"
                : percentageUsed >= 90
                ? "warning"
                : "info",
          });
        }
      }

      res.json({
        success: true,
        data: alerts,
      });
    }
  );
}
