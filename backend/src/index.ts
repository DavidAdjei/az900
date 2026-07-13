import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import questionRoutes from "./routes/questions";
import flashcardRoutes from "./routes/flashcards";
import progressRoutes from "./routes/progress";
import learningRoutes from "./routes/learning";
import examRoutes from "./routes/exam";
import morgan from "morgan";

const app = express();

app.use(morgan("dev"));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/exam", examRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`AZ-900 API listening on port ${port}`);
});
