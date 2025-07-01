import { Router } from "express";
import { BudgetController } from "../controllers/budget";
import { authenticate } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validation";
import { createBudgetSchema, updateBudgetSchema } from "../utils/validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Budget routes
router.post(
  "/",
  validateRequest(createBudgetSchema),
  BudgetController.createBudget
);
router.get("/", BudgetController.getBudgets);
router.get("/alerts", BudgetController.getBudgetAlerts);
router.get("/:id", BudgetController.getBudgetById);
router.get("/:id/progress", BudgetController.getBudgetProgress);
router.put(
  "/:id",
  validateRequest(updateBudgetSchema),
  BudgetController.updateBudget
);
router.delete("/:id", BudgetController.deleteBudget);

export default router;
