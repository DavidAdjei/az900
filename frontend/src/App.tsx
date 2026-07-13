import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { LearningPath } from "./pages/LearningPath";
import { ChapterPage } from "./pages/ChapterPage";
import { ExamLanding } from "./pages/ExamLanding";
import { ExamSession } from "./pages/ExamSession";
import { ExamReview } from "./pages/ExamReview";
import { Quiz } from "./pages/Quiz";
import { Flashcards } from "./pages/Flashcards";
import { Progress } from "./pages/Progress";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />

              {/* Everything below requires sign-in. Backend routes enforce this
                  independently (requireAuth) — this guard is purely a frontend UX
                  layer so signed-out visitors land on /login instead of a broken page. */}
              <Route element={<ProtectedRoute />}>
                <Route path="learn" element={<LearningPath />} />
                <Route path="learn/:topicId" element={<ChapterPage />} />
                <Route path="exam" element={<ExamLanding />} />
                <Route path="exam/:sessionId" element={<ExamSession />} />
                <Route path="exam/:sessionId/review" element={<ExamReview />} />
                <Route path="quiz" element={<Quiz />} />
                <Route path="flashcards" element={<Flashcards />} />
                <Route path="progress" element={<Progress />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
