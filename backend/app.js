import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const configuredOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const allowedFrontendOrigins = new Set();
for (const entry of configuredOrigins) {
  try {
    const parsed = new URL(entry);
    allowedFrontendOrigins.add(parsed.origin);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      allowedFrontendOrigins.add(parsed.origin);
    } else if (parsed.hostname === "127.0.0.1") {
      parsed.hostname = "localhost";
      allowedFrontendOrigins.add(parsed.origin);
    }
  } catch {
    // ignore malformed URLs
  }
}

app.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  next();
});

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedFrontendOrigins.has(origin)),
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({ success: true, message: "FairWork AI API is running.", health: "/api/health" });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});
app.use(errorHandler);

export default app;
