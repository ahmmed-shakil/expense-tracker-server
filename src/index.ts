import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import cron from "node-cron";
import axios from "axios";

import routes from "./routes";
import { errorHandler, notFound } from "./middlewares/error";
import { prisma } from "./utils/db";

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// API routes
app.use("/api", routes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Expense Tracker API is running",
    version: "1.0.0",
  });
});

// Handle 404
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Keep-alive cron job (every 30 seconds)
const setupKeepAlive = () => {
  const RENDER_URL = process.env.RENDER_URL; // Add this to your environment variables

  if (RENDER_URL && process.env.NODE_ENV === "production") {
    cron.schedule("*/30 * * * * *", async () => {
      try {
        await axios.get(`${RENDER_URL}/health`);
        // console.log("Keep-alive ping successful");
      } catch (error) {
        // console.error("Keep-alive ping failed:", error.message);
      }
    });
    // console.log("Keep-alive cron job started - pinging every 30 seconds");
  }
};

// Start keep-alive after server starts
setupKeepAlive();

// Graceful shutdown
process.on("SIGINT", async () => {
  // console.log("Received SIGINT. Graceful shutdown...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  // console.log("Received SIGTERM. Graceful shutdown...");
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  // console.log(`Server is running on port ${PORT}`);
  // console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
