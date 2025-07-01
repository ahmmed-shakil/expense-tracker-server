import { Router } from "express";
import { ExpenseController } from "../controllers/expense";
import { authenticate } from "../middlewares/auth";
import { validateBody, validateQuery } from "../middlewares/validation";
import {
  createExpenseSchema,
  updateExpenseSchema,
  getExpensesSchema,
} from "../utils/validation";

const router = Router();

// All expense routes are protected
router.use(authenticate);

router.post(
  "/",
  validateBody(createExpenseSchema),
  ExpenseController.createExpense
);
router.get(
  "/",
  validateQuery(getExpensesSchema),
  ExpenseController.getExpenses
);
router.get("/stats", ExpenseController.getExpenseStats);
router.get("/:id", ExpenseController.getExpenseById);
router.put(
  "/:id",
  validateBody(updateExpenseSchema),
  ExpenseController.updateExpense
);
router.delete("/:id", ExpenseController.deleteExpense);

export default router;
