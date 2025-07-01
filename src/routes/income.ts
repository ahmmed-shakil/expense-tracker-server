import { Router } from "express";
import { IncomeController } from "../controllers/income";
import { authenticate } from "../middlewares/auth";
import { validateRequest, validateQuery } from "../middlewares/validation";
import {
  createIncomeSchema,
  updateIncomeSchema,
  getIncomesSchema,
} from "../utils/validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Income routes
router.post(
  "/",
  validateRequest(createIncomeSchema),
  IncomeController.createIncome
);
router.get("/", validateQuery(getIncomesSchema), IncomeController.getIncomes);
router.get("/stats", IncomeController.getIncomeStats);
router.get("/:id", IncomeController.getIncomeById);
router.put(
  "/:id",
  validateRequest(updateIncomeSchema),
  IncomeController.updateIncome
);
router.delete("/:id", IncomeController.deleteIncome);

export default router;
