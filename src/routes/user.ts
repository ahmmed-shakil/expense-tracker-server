import { Router } from "express";
import { UserController } from "../controllers/user";
import { authenticate } from "../middlewares/auth";
import { validateBody } from "../middlewares/validation";
import { updateProfileSchema, changePasswordSchema } from "../utils/validation";

const router = Router();

// All user routes are protected
router.use(authenticate);

router.get("/profile", UserController.getProfile);
router.put(
  "/profile",
  validateBody(updateProfileSchema),
  UserController.updateProfile
);
router.put(
  "/password",
  validateBody(changePasswordSchema),
  UserController.changePassword
);
router.delete("/account", UserController.deleteAccount);
router.get("/stats", UserController.getUserStats);

export default router;
