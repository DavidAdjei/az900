import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getLearningState, DOMAIN_ORDER } from "../lib/learningProgress";

const router = Router();

const EXAM_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const QUESTIONS_PER_EXAM = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function isEligible(userId: string) {
  const { domains } = await getLearningState(userId);
  // Every domain must be unlocked AND fully completed (100%) to sit the mock exam.
  return domains.every((d) => d.unlocked && d.totalChapters > 0 && d.completedChapters === d.totalChapters);
}

/** Grades a session against ExamQuestion answer keys and marks it finalized. Idempotent. */
async function finalizeSession(session: { id: string; status: string; questionIds: unknown; answers: unknown }) {
  if (session.status !== "IN_PROGRESS") return session;

  const questionIds = session.questionIds as string[];
  const answers = (session.answers as Record<string, string[]>) ?? {};

  const questions = await prisma.examQuestion.findMany({ where: { id: { in: questionIds } } });
  const byId = new Map(questions.map((q) => [q.id, q]));

  let correctCount = 0;
  for (const qId of questionIds) {
    const q = byId.get(qId);
    if (!q) continue;
    const correct = (q.correctChoiceIds as string[]) ?? [];
    const chosen = answers[qId] ?? [];
    const isCorrect = chosen.length === correct.length && [...chosen].sort().join(",") === [...correct].sort().join(",");
    if (isCorrect) correctCount++;
  }

  const score = questionIds.length ? Math.round((correctCount / questionIds.length) * 100) : 0;
  const now = new Date();
  const isExpired = now > (session as any).expiresAt;

  return prisma.examSession.update({
    where: { id: session.id },
    data: {
      status: isExpired ? "EXPIRED" : "SUBMITTED",
      correctCount,
      score,
      submittedAt: now,
    },
  });
}

/** Loads a session, auto-finalizing it first if the 2-hour window has passed. */
async function loadAndMaybeFinalize(sessionId: string, userId: string) {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) return null;

  if (session.status === "IN_PROGRESS" && new Date() > session.expiresAt) {
    return finalizeSession(session);
  }
  return session;
}

// GET /api/exam/eligibility
router.get("/eligibility", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const eligible = await isEligible(userId);

  const active = await prisma.examSession.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });

  let activeSessionId: string | null = null;
  if (active) {
    const resolved = await loadAndMaybeFinalize(active.id, userId);
    if (resolved && resolved.status === "IN_PROGRESS") activeSessionId = resolved.id;
  }

  const { domains } = await getLearningState(userId);

  res.json({ eligible, activeSessionId, domains: domains.map((d) => ({ id: d.id, progressPercent: d.progressPercent, unlocked: d.unlocked })) });
});

// POST /api/exam/start
// Resumes an existing in-progress session if one exists; otherwise starts a fresh one.
router.post("/start", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;

  const eligible = await isEligible(userId);
  if (!eligible) {
    return res.status(403).json({ error: "Complete every domain in the Learning Path before starting the practice exam." });
  }

  const existing = await prisma.examSession.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (existing) {
    const resolved = await loadAndMaybeFinalize(existing.id, userId);
    if (resolved && resolved.status === "IN_PROGRESS") {
      return res.json({ sessionId: resolved.id, resumed: true });
    }
  }

  // Sample questions proportionally per domain from the pool.
  const selectedIds: string[] = [];
  const domainCounts = await Promise.all(
    DOMAIN_ORDER.map(async (domain) => ({ domain, total: await prisma.examQuestion.count({ where: { domain } }) }))
  );
  const grandTotal = domainCounts.reduce((s, d) => s + d.total, 0) || 1;

  for (const { domain, total } of domainCounts) {
    if (total === 0) continue;
    const take = Math.max(1, Math.round((total / grandTotal) * QUESTIONS_PER_EXAM));
    const pool = await prisma.examQuestion.findMany({ where: { domain }, select: { id: true } });
    const chosen = shuffle(pool.map((p) => p.id)).slice(0, Math.min(take, pool.length));
    selectedIds.push(...chosen);
  }

  const finalIds = shuffle(selectedIds).slice(0, QUESTIONS_PER_EXAM);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + EXAM_DURATION_MS);

  const session = await prisma.examSession.create({
    data: {
      userId,
      questionIds: finalIds,
      answers: {},
      totalQuestions: finalIds.length,
      startedAt,
      expiresAt,
    },
  });

  res.json({ sessionId: session.id, resumed: false });
});

// GET /api/exam/session/:id
// Full session state for the exam-taking UI: sanitized questions (no answer keys), the
// user's saved answers so far, and remaining time. Safe to call repeatedly (e.g. on page load
// after a refresh) — this is how progress survives an accidental navigation away.
router.get("/session/:id", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const session = await loadAndMaybeFinalize(req.params.id, userId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const questionIds = session.questionIds as string[];
  const questions = await prisma.examQuestion.findMany({ where: { id: { in: questionIds } } });
  const byId = new Map(questions.map((q) => [q.id, q]));

  // Preserve the session's original question order.
  const orderedQuestions = questionIds
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => !!q)
    .map((q) => ({ id: q.id, domain: q.domain, prompt: q.prompt, choices: q.choices, multiSelect: q.multiSelect, diagramSvg: q.diagramSvg }));

  res.json({
    id: session.id,
    status: session.status,
    totalQuestions: session.totalQuestions,
    answers: session.answers,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    remainingMs: Math.max(0, session.expiresAt.getTime() - Date.now()),
    score: session.score,
    correctCount: session.correctCount,
    questions: orderedQuestions,
  });
});

// POST /api/exam/session/:id/answer  { questionId, chosenChoiceIds }
// Autosaves a single answer. Called every time the user selects/changes an answer, so progress
// is never lost even if the tab is closed mid-exam.
router.post("/session/:id/answer", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const { questionId, chosenChoiceIds } = req.body as { questionId?: string; chosenChoiceIds?: string[] };

  if (!questionId || !Array.isArray(chosenChoiceIds)) {
    return res.status(400).json({ error: "questionId and chosenChoiceIds are required" });
  }

  const session = await loadAndMaybeFinalize(req.params.id, userId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status !== "IN_PROGRESS") {
    return res.status(409).json({ error: "This exam session has already ended.", status: session.status });
  }

  const answers = { ...((session.answers as Record<string, string[]>) ?? {}) };
  if (chosenChoiceIds.length === 0) {
    delete answers[questionId];
  } else {
    answers[questionId] = chosenChoiceIds;
  }

  await prisma.examSession.update({ where: { id: session.id }, data: { answers } });

  res.json({ answeredCount: Object.keys(answers).length });
});

// POST /api/exam/session/:id/submit
router.post("/session/:id/submit", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const session = await prisma.examSession.findUnique({ where: { id: req.params.id } });
  if (!session || session.userId !== userId) return res.status(404).json({ error: "Session not found" });

  if (session.status !== "IN_PROGRESS") {
    return res.json({ id: session.id, status: session.status, score: session.score, correctCount: session.correctCount, totalQuestions: session.totalQuestions });
  }

  const finalized = await finalizeSession(session);
  res.json({
    id: finalized.id,
    status: finalized.status,
    score: finalized.score,
    correctCount: finalized.correctCount,
    totalQuestions: finalized.totalQuestions,
  });
});

// GET /api/exam/session/:id/review
// Full per-question breakdown with correct answers + explanations. Only available once the
// session is no longer in progress, so it can't be used to peek at answers mid-exam.
router.get("/session/:id/review", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const session = await prisma.examSession.findUnique({ where: { id: req.params.id } });
  if (!session || session.userId !== userId) return res.status(404).json({ error: "Session not found" });
  if (session.status === "IN_PROGRESS") {
    return res.status(403).json({ error: "Submit the exam before reviewing answers." });
  }

  const questionIds = session.questionIds as string[];
  const answers = (session.answers as Record<string, string[]>) ?? {};
  const questions = await prisma.examQuestion.findMany({ where: { id: { in: questionIds } } });
  const byId = new Map(questions.map((q) => [q.id, q]));

  const review = questionIds
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => !!q)
    .map((q) => {
      const correct = (q.correctChoiceIds as string[]) ?? [];
      const chosen = answers[q.id] ?? [];
      const isCorrect = chosen.length === correct.length && [...chosen].sort().join(",") === [...correct].sort().join(",");
      return {
        id: q.id,
        domain: q.domain,
        prompt: q.prompt,
        choices: q.choices,
        multiSelect: q.multiSelect,
        diagramSvg: q.diagramSvg,
        correctChoiceIds: correct,
        chosenChoiceIds: chosen,
        correct: isCorrect,
        explanation: q.explanation,
      };
    });

  res.json({
    id: session.id,
    status: session.status,
    score: session.score,
    correctCount: session.correctCount,
    totalQuestions: session.totalQuestions,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt,
    questions: review,
  });
});

// GET /api/exam/history
router.get("/history", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const sessions = await prisma.examSession.findMany({
    where: { userId, status: { in: ["SUBMITTED", "EXPIRED"] } },
    orderBy: { startedAt: "desc" },
    select: { id: true, status: true, score: true, correctCount: true, totalQuestions: true, startedAt: true, submittedAt: true },
  });
  res.json({ sessions });
});

export default router;
