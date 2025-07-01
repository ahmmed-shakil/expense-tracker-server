import { Router } from "express";
import { CategoryController } from "../controllers/category";
import { authenticate } from "../middlewares/auth";
import { validateBody } from "../middlewares/validation";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../utils/validation";

const router = Router();

// All category routes are protected
router.use(authenticate);

router.post(
  "/",
  validateBody(createCategorySchema),
  CategoryController.createCategory
);
router.get("/", CategoryController.getCategories);
router.get("/:id", CategoryController.getCategoryById);
router.put(
  "/:id",
  validateBody(updateCategorySchema),
  CategoryController.updateCategory
);
router.delete("/:id", CategoryController.deleteCategory);
router.get("/:id/stats", CategoryController.getCategoryStats);

export default router;
