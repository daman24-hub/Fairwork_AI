import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const frontendOrigin = new URL(process.env.FRONTEND_URL || "http://localhost:5173");
const allowedFrontendOrigins = new Set([frontendOrigin.origin]);
if (frontendOrigin.hostname === "localhost") {
  frontendOrigin.hostname = "127.0.0.1";
  allowedFrontendOrigins.add(frontendOrigin.origin);
} else if (frontendOrigin.hostname === "127.0.0.1") {
  frontendOrigin.hostname = "localhost";
  allowedFrontendOrigins.add(frontendOrigin.origin);
}

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedFrontendOrigins.has(origin)),
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});
app.use(errorHandler);

export default app;
