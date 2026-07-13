const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export type Concept = {
  id: string;
  topicId: string;
  domain: string;
  term: string;
  definition: string;
  details?: string | null;
  plainEnglish?: string | null;
  examTips?: string[] | null;
  gotchas?: string[] | null;
  examples?: string[] | null;
  quickCheckQuestion?: string | null;
  quickCheckAnswer?: string | null;
  sortOrder: number;
};

export type Topic = {
  id: string;
  domain: string;
  name: string;
  sortOrder: number;
  concepts: Concept[];
};

export type ChapterSummary = {
  id: string;
  name: string;
  sortOrder: number;
  unlocked: boolean;
  completed: boolean;
  bestScore: number;
  conceptCount: number;
  quizQuestionCount: number;
};

export type DomainSummary = {
  id: string;
  unlocked: boolean;
  totalChapters: number;
  completedChapters: number;
  progressPercent: number;
  chapters: ChapterSummary[];
};

export type ChapterDetail = {
  topic: Topic & { quizQuestionCount: number };
  progress: {
    completed: boolean;
    bestScore: number;
    conceptsViewed: number;
    totalConcepts: number;
    readingPercent: number;
    viewedConceptIds: string[];
  };
  navigation: { prevTopicId: string | null; nextTopicId: string | null };
};

export type ChapterQuizQuestion = { id: string; prompt: string; choices: { id: string; text: string }[] };

export type PracticeQuestion = {
  id: string;
  domain: string;
  prompt: string;
  choices: { id: string; text: string }[];
  multiSelect: boolean;
  diagramSvg?: string | null;
};

export type ExamQuestion = PracticeQuestion;

export type ExamSessionState = {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  totalQuestions: number;
  answers: Record<string, string[]>;
  startedAt: string;
  expiresAt: string;
  remainingMs: number;
  score: number | null;
  correctCount: number | null;
  questions: ExamQuestion[];
};

export type ExamReviewQuestion = ExamQuestion & {
  correctChoiceIds: string[];
  chosenChoiceIds: string[];
  correct: boolean;
  explanation: string;
};

export type ExamEligibility = {
  eligible: boolean;
  activeSessionId: string | null;
  domains: { id: string; progressPercent: number; unlocked: boolean }[];
};

export type ExamHistoryEntry = {
  id: string;
  status: "SUBMITTED" | "EXPIRED";
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  startedAt: string;
  submittedAt: string | null;
};

function getToken() {
  return localStorage.getItem("az900_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ email, password, name }) }
    ),

  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  getQuestions: (domain: string, count = 10) =>
    request<{ questions: PracticeQuestion[] }>(`/api/questions?domain=${domain}&count=${count}`),

  submitAttempt: (questionId: string, chosenChoiceIds: string[]) =>
    request<{ correct: boolean; correctChoiceIds: string[]; explanation: string }>(
      `/api/questions/${questionId}/attempt`,
      { method: "POST", body: JSON.stringify({ chosenChoiceIds }) }
    ),

  getFlashcards: (domain: string, dueOnly = false) =>
    request<{ flashcards: any[] }>(`/api/flashcards?domain=${domain}&dueOnly=${dueOnly}`),

  reviewFlashcard: (id: string, grade: "again" | "good") =>
    request<{ box: number; nextReviewAt: string }>(`/api/flashcards/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ grade }),
    }),

  getProgress: () => request<{ domains: any[] }>("/api/progress"),

  getLearningDomains: () => request<{ domains: DomainSummary[] }>("/api/learning/domains"),

  getChapter: (topicId: string) => request<ChapterDetail>(`/api/learning/chapters/${topicId}`),

  markConceptViewed: (topicId: string, conceptId: string) =>
    request<{ conceptsViewed: number; totalConcepts: number; readingPercent: number }>(
      `/api/learning/chapters/${topicId}/view`,
      { method: "POST", body: JSON.stringify({ conceptId }) }
    ),

  getChapterQuiz: (topicId: string) =>
    request<{ questions: ChapterQuizQuestion[]; passThreshold: number }>(`/api/learning/chapters/${topicId}/quiz`),

  submitChapterQuizAttempt: (topicId: string, questionId: string, chosenChoiceId: string) =>
    request<{ correct: boolean; correctChoiceId: string; explanation: string }>(
      `/api/learning/chapters/${topicId}/quiz/${questionId}/attempt`,
      { method: "POST", body: JSON.stringify({ chosenChoiceId }) }
    ),

  completeChapter: (topicId: string) =>
    request<{
      passed: boolean;
      score: number;
      requiredScore: number;
      correctCount: number;
      totalQuestions: number;
      nextTopicId: string | null;
      domainCompleted: boolean;
    }>(`/api/learning/chapters/${topicId}/complete`, { method: "POST" }),

  getExamEligibility: () => request<ExamEligibility>("/api/exam/eligibility"),

  startExam: () => request<{ sessionId: string; resumed: boolean }>("/api/exam/start", { method: "POST" }),

  getExamSession: (sessionId: string) => request<ExamSessionState>(`/api/exam/session/${sessionId}`),

  saveExamAnswer: (sessionId: string, questionId: string, chosenChoiceIds: string[]) =>
    request<{ answeredCount: number }>(`/api/exam/session/${sessionId}/answer`, {
      method: "POST",
      body: JSON.stringify({ questionId, chosenChoiceIds }),
    }),

  submitExam: (sessionId: string) =>
    request<{ id: string; status: string; score: number; correctCount: number; totalQuestions: number }>(
      `/api/exam/session/${sessionId}/submit`,
      { method: "POST" }
    ),

  getExamReview: (sessionId: string) =>
    request<{
      id: string;
      status: string;
      score: number;
      correctCount: number;
      totalQuestions: number;
      startedAt: string;
      submittedAt: string;
      questions: ExamReviewQuestion[];
    }>(`/api/exam/session/${sessionId}/review`),

  getExamHistory: () => request<{ sessions: ExamHistoryEntry[] }>("/api/exam/history"),
};

export function setToken(token: string) {
  localStorage.setItem("az900_token", token);
}

export function clearToken() {
  localStorage.removeItem("az900_token");
}

export { getToken };
