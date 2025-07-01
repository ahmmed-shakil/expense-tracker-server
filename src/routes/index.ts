import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./user";
import expenseRoutes from "./expense";
import categoryRoutes from "./category";
import incomeRoutes from "./income";
import budgetRoutes from "./budget";

const router = Router();

// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/expenses", expenseRoutes);
router.use("/categories", categoryRoutes);
router.use("/income", incomeRoutes);
router.use("/budget", budgetRoutes);

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
