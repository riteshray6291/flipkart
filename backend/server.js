// External dependencies
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import fileUpload from "express-fileupload";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Application modules
import connectDB from "./config/database.js";
import authRoute from "./routes/authRoute.js";
import productRoute from "./routes/productRoute.js";
import userRoute from "./routes/userRoute.js";
import affiliateRoute from "./routes/affiliateRoute.js";

const app = express();

// Load environment variables before configuring services.
dotenv.config({ path: path.join(__dirname, ".env") });

// Configure Cloudinary from the backend environment.
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

const isProduction = process.env.NODE_ENV === "production";
const developmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

// Normalize configured origins and reject URL paths, credentials, and invalid URLs.
const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    let parsedOrigin;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`Invalid origin in CORS_ORIGINS: ${origin}`);
    }

    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.pathname !== "/" ||
      parsedOrigin.search ||
      parsedOrigin.hash ||
      parsedOrigin.username ||
      parsedOrigin.password
    ) {
      throw new Error(
        `CORS_ORIGINS entries must be plain HTTP or HTTPS origins: ${origin}`,
      );
    }

    const hostname = parsedOrigin.hostname.replace(/^\[|\]$/g, "");
    const isLocalhost =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.startsWith("127.") ||
      hostname === "::1";

    if (isProduction && (parsedOrigin.protocol !== "https:" || isLocalhost)) {
      throw new Error(
        `Production CORS origins must use HTTPS and cannot use localhost: ${origin}`,
      );
    }

    return parsedOrigin.origin;
  });

const allowedOrigins = new Set([
  ...(isProduction ? [] : developmentOrigins),
  ...configuredOrigins,
]);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      const error = new Error("Origin is not allowed by CORS.");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  }),
);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  if (isProduction)
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true,
    safeFileNames: true,
  }),
);
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
// Serve the built frontend here when deploying both apps together.
// app.use(express.static(path.join(__dirname, "../client/dist")));
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.status(200).json({ service: "e-commerce-api", status: "ok" });
});
app.get("/health", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
    database: databaseReady ? "connected" : "disconnected",
  });
});

// API routes
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/affiliate", affiliateRoute);

app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found." }),
);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status === 413 ? 413 : error.status || 500;
  if (!isProduction) console.error(error);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error." : error.message,
  });
});

// app.use("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../client/dist/index.html"));
// });

const startServer = async () => {
  try {
    if (isProduction) {
      if (
        !process.env.JWT_SECRET ||
        Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
      ) {
        throw new Error(
          "Production requires a JWT_SECRET of at least 32 bytes.",
        );
      }
      if (process.env.PAYMENT_MODE === "fake") {
        throw new Error("PAYMENT_MODE=fake is not allowed in production.");
      }
      if (!allowedOrigins.size)
        throw new Error(
          "Production requires CORS_ORIGINS to contain the frontend origin.",
        );
    } else if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is required. Add a private secret to backend/.env.",
      );
    }
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`API listening on port ${PORT}`);
    });
    const shutdown = (signal) => {
      console.log(`${signal} received. Closing HTTP server.`);
      server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error(
      "API startup failed. Check the environment and database connection.",
      error.message,
    );
    process.exitCode = 1;
  }
};

startServer();
