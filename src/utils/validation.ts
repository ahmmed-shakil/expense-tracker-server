import { z } from "zod";

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
});

// User Schemas
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  avatar: z.string().url("Invalid avatar URL").optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(100),
});

// Expense Schemas
export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required").max(255),
  notes: z.string().max(1000).optional(),
  date: z.string().datetime().optional(),
  categoryId: z.string().cuid("Invalid category ID"),
});

export const updateExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive").optional(),
  description: z.string().min(1, "Description is required").max(255).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().datetime().optional(),
  categoryId: z.string().cuid("Invalid category ID").optional(),
});

export const getExpensesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  categoryId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(255).optional(),
});

// Income Schemas
export const createIncomeSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required").max(255),
  source: z.string().min(1, "Source is required").max(100),
  date: z.string().datetime().optional(),
});

export const updateIncomeSchema = z.object({
  amount: z.number().positive("Amount must be positive").optional(),
  description: z.string().min(1, "Description is required").max(255).optional(),
  source: z.string().min(1, "Source is required").max(100).optional(),
  date: z.string().datetime().optional(),
});

export const getIncomesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(255).optional(),
});

// Budget Schemas
export const createBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(100),
  amount: z.number().positive("Amount must be positive"),
  startDate: z.string().datetime("Start date is required"),
  endDate: z.string().datetime("End date is required"),
  categoryId: z.string().cuid("Invalid category ID").optional(),
});

export const updateBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(100).optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  categoryId: z.string().cuid("Invalid category ID").optional(),
  isActive: z.boolean().optional(),
});

// Category Schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().max(255).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
    .optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100).optional(),
  description: z.string().max(255).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
    .optional(),
  isActive: z.boolean().optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type GetExpensesInput = z.infer<typeof getExpensesSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type GetIncomesInput = z.infer<typeof getIncomesSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
