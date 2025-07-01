import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../utils/db";
import { createError, asyncHandler } from "../middlewares/error";
import {
  CreateIncomeInput,
  UpdateIncomeInput,
  GetIncomesInput,
} from "../utils/validation";

export class IncomeController {
  static createIncome = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { amount, description, source, date }: CreateIncomeInput = req.body;
      const userId = req.user!.userId;

      const income = await prisma.income.create({
        data: {
          amount,
          description,
          source,
          date: date ? new Date(date) : new Date(),
          userId,
        },
      });

      res.status(201).json({
        success: true,
        message: "Income created successfully",
        data: income,
      });
    }
  );

  static getIncomes = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        search,
      }: GetIncomesInput = req.query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { userId };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      if (search) {
        where.OR = [
          { description: { contains: search } },
          { source: { contains: search } },
        ];
      }

      const [incomes, total] = await Promise.all([
        prisma.income.findMany({
          where,
          orderBy: { date: "desc" },
          skip,
          take: limit,
        }),
        prisma.income.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          incomes,
          total,
          page,
          totalPages,
        },
      });
    }
  );

  static getIncomeById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.userId;

      const income = await prisma.income.findFirst({
        where: { id, userId },
      });

      if (!income) {
        throw createError("Income not found", 404);
      }

      res.json({
        success: true,
        data: income,
      });
    }
  );

  static updateIncome = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.userId;
      const updateData: UpdateIncomeInput = req.body;

      const existingIncome = await prisma.income.findFirst({
        where: { id, userId },
      });

      if (!existingIncome) {
        throw createError("Income not found", 404);
      }

      const updatedIncome = await prisma.income.update({
        where: { id },
        data: {
          ...updateData,
          date: updateData.date ? new Date(updateData.date) : undefined,
        },
      });

      res.json({
        success: true,
        message: "Income updated successfully",
        data: updatedIncome,
      });
    }
  );

  static deleteIncome = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.userId;

      const income = await prisma.income.findFirst({
        where: { id, userId },
      });

      if (!income) {
        throw createError("Income not found", 404);
      }

      await prisma.income.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Income deleted successfully",
      });
    }
  );

  static getIncomeStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      const where: any = { userId };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate as string);
        if (endDate) where.date.lte = new Date(endDate as string);
      }

      const [stats, sourceBreakdown] = await Promise.all([
        prisma.income.aggregate({
          where,
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true },
        }),
        prisma.income.groupBy({
          by: ["source"],
          where,
          _sum: { amount: true },
          _count: { id: true },
          orderBy: { _sum: { amount: "desc" } },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalAmount: stats._sum.amount || 0,
          totalCount: stats._count.id || 0,
          averageAmount: stats._avg.amount || 0,
          sourceBreakdown,
        },
      });
    }
  );
}
