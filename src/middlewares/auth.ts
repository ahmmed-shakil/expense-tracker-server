import { Request, Response, NextFunction } from "express";
import { AuthUtils, JWTPayload } from "../utils/auth";
import { prisma } from "../utils/db";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  body: any;
  cookies: any;
  query: any;
  params: any;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token not found",
      });
      return;
    }

    const decoded = AuthUtils.verifyAccessToken(token) as JWTPayload;

    // Check if user exists and is active
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Access token expired",
        code: "TOKEN_EXPIRED",
      });
      return;
    }

    if (error instanceof Error && error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
      return;
    }

    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
