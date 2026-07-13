import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth";
import questionRoutes from "./routes/questions";
import flashcardRoutes from "./routes/flashcards";
import progressRoutes from "./routes/progress";
import learningRoutes from "./routes/learning";
import examRoutes from "./routes/exam";

const app = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to the AZ-900 API" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/exam", examRoutes);

app.use((_req, res) => {
  res.status(404).json({
    error: "Not found",
  });
});

export default app;