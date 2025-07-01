import { Router } from "express";
import { AuthController } from "../controllers/auth";
import { authenticate } from "../middlewares/auth";
import { validateBody } from "../middlewares/validation";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../utils/validation";

const router = Router();

// Public routes
router.post("/register", validateBody(registerSchema), AuthController.register);
router.post("/login", validateBody(loginSchema), AuthController.login);
router.post("/logout", AuthController.logout);
router.post("/refresh", AuthController.refreshToken);
router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  AuthController.forgotPassword
);
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  AuthController.resetPassword
);

// Protected routes
router.use(authenticate);
router.get("/me", AuthController.me);
router.post(
  "/change-password",
  validateBody(changePasswordSchema),
  AuthController.changePassword
);

export default router;
