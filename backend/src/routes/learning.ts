import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getLearningState, isChapterUnlocked, PASS_THRESHOLD } from "../lib/learningProgress";

const router = Router();

// GET /api/learning/domains
// The full roadmap for the signed-in user: which domains/chapters are unlocked,
// completed, and how far along each one is.
router.get("/domains", requireAuth, async (req: AuthedRequest, res) => {
  const { domains } = await getLearningState(req.userId as string);
  res.json({ domains });
});

// GET /api/learning/chapters/:topicId
// Full chapter content (concepts) plus this user's reading + quiz progress.
// 403s if the chapter is locked, so the frontend can't route around the gate.
router.get("/chapters/:topicId", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const { topicId } = req.params;

  const state = await isChapterUnlocked(userId, topicId);
  if (!state.exists) return res.status(404).json({ error: "Chapter not found" });
  if (!state.unlocked) {
    return res.status(403).json({ error: "This chapter is locked. Complete the previous chapter first." });
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      concepts: { orderBy: { sortOrder: "asc" } },
      _count: { select: { quizQuestions: true } },
    },
  });
  if (!topic) return res.status(404).json({ error: "Chapter not found" });

  const [views, progress, allChaptersInDomain] = await Promise.all([
    prisma.conceptView.findMany({ where: { userId, conceptId: { in: topic.concepts.map((c) => c.id) } } }),
    prisma.chapterProgress.findUnique({ where: { userId_topicId: { userId, topicId } } }),
    prisma.topic.findMany({ where: { domain: topic.domain }, orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } }),
  ]);

  const viewedIds = new Set(views.map((v) => v.conceptId));
  const idx = allChaptersInDomain.findIndex((t) => t.id === topicId);
  const prevTopicId = idx > 0 ? allChaptersInDomain[idx - 1].id : null;
  const nextTopicId = idx >= 0 && idx < allChaptersInDomain.length - 1 ? allChaptersInDomain[idx + 1].id : null;

  res.json({
    topic: {
      id: topic.id,
      name: topic.name,
      domain: topic.domain,
      sortOrder: topic.sortOrder,
      concepts: topic.concepts,
      quizQuestionCount: topic._count.quizQuestions,
    },
    progress: {
      completed: progress?.completed ?? false,
      bestScore: progress?.bestScore ?? 0,
      conceptsViewed: viewedIds.size,
      totalConcepts: topic.concepts.length,
      readingPercent: topic.concepts.length ? Math.round((viewedIds.size / topic.concepts.length) * 100) : 0,
      viewedConceptIds: Array.from(viewedIds),
    },
    navigation: { prevTopicId, nextTopicId },
  });
});

// POST /api/learning/chapters/:topicId/view  { conceptId }
// Marks a concept as read for this user. Idempotent (safe to call every time a card is expanded).
router.post("/chapters/:topicId/view", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const { topicId } = req.params;
  const { conceptId } = req.body as { conceptId?: string };

  const state = await isChapterUnlocked(userId, topicId);
  if (!state.exists) return res.status(404).json({ error: "Chapter not found" });
  if (!state.unlocked) return res.status(403).json({ error: "This chapter is locked." });
  if (!conceptId) return res.status(400).json({ error: "conceptId is required" });

  await prisma.conceptView.upsert({
    where: { userId_conceptId: { userId, conceptId } },
    create: { userId, conceptId },
    update: {},
  });

  const [viewCount, totalConcepts] = await Promise.all([
    prisma.conceptView.count({ where: { userId, concept: { topicId } } }),
    prisma.concept.count({ where: { topicId } }),
  ]);

  res.json({
    conceptsViewed: viewCount,
    totalConcepts,
    readingPercent: totalConcepts ? Math.round((viewCount / totalConcepts) * 100) : 0,
  });
});

// GET /api/learning/chapters/:topicId/quiz
// Sanitized chapter quiz questions (no answers) for the gate at the end of the chapter.
router.get("/chapters/:topicId/quiz", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const { topicId } = req.params;

  const state = await isChapterUnlocked(userId, topicId);
  if (!state.exists) return res.status(404).json({ error: "Chapter not found" });
  if (!state.unlocked) return res.status(403).json({ error: "This chapter is locked." });

  const questions = await prisma.chapterQuizQuestion.findMany({
    where: { topicId },
    orderBy: { sortOrder: "asc" },
  });

  res.json({
    questions: questions.map((q) => ({ id: q.id, prompt: q.prompt, choices: q.choices })),
    passThreshold: Math.round(PASS_THRESHOLD * 100),
  });
});

// POST /api/learning/chapters/:topicId/quiz/:questionId/attempt  { chosenChoiceId }
router.post("/chapters/:topicId/quiz/:questionId/attempt", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const { topicId, questionId } = req.params;
  const { chosenChoiceId } = req.body as { chosenChoiceId?: string };

  const state = await isChapterUnlocked(userId, topicId);
  if (!state.exists) return res.status(404).json({ error: "Chapter not found" });
  if (!state.unlocked) return res.status(403).json({ error: "This chapter is locked." });
  if (!chosenChoiceId) return res.status(400).json({ error: "chosenChoiceId is required" });

  const question = await prisma.chapterQuizQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.topicId !== topicId) return res.status(404).json({ error: "Question not found" });

  const correct = question.correctChoiceId === chosenChoiceId;

  await prisma.chapterQuizAttempt.create({
    data: { userId, questionId, chosenChoiceId, correct },
  });

  res.json({ correct, correctChoiceId: question.correctChoiceId, explanation: question.explanation });
});

// POST /api/learning/chapters/:topicId/complete
// Call once the user has been through the chapter quiz. Passes if the user has, across all
// their attempts, gotten at least PASS_THRESHOLD of that chapter's questions right at least once.
// Retrying is always allowed — this rewards eventually understanding the material, not
// getting it right on the first try.
router.post("/chapters/:topicId/complete", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const { topicId } = req.params;

  const state = await isChapterUnlocked(userId, topicId);
  if (!state.exists) return res.status(404).json({ error: "Chapter not found" });
  if (!state.unlocked) return res.status(403).json({ error: "This chapter is locked." });

  const questions = await prisma.chapterQuizQuestion.findMany({ where: { topicId }, select: { id: true } });
  if (questions.length === 0) {
    return res.status(400).json({ error: "This chapter has no quiz questions configured." });
  }

  const attempts = await prisma.chapterQuizAttempt.findMany({
    where: { userId, questionId: { in: questions.map((q) => q.id) } },
  });

  const correctQuestionIds = new Set(attempts.filter((a) => a.correct).map((a) => a.questionId));
  const score = correctQuestionIds.size / questions.length;
  const passed = score >= PASS_THRESHOLD;
  const scorePercent = Math.round(score * 100);

  let domainCompleted = false;
  let nextTopicId: string | null = null;

  if (passed) {
    const existing = await prisma.chapterProgress.findUnique({ where: { userId_topicId: { userId, topicId } } });
    await prisma.chapterProgress.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: { userId, topicId, completed: true, completedAt: new Date(), bestScore: scorePercent },
      update: {
        completed: true,
        completedAt: existing?.completedAt ?? new Date(),
        bestScore: Math.max(existing?.bestScore ?? 0, scorePercent),
      },
    });

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (topic) {
      const siblings = await prisma.topic.findMany({
        where: { domain: topic.domain },
        orderBy: { sortOrder: "asc" },
      });
      const idx = siblings.findIndex((t) => t.id === topicId);
      nextTopicId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null;

      const progressRows = await prisma.chapterProgress.findMany({
        where: { userId, topicId: { in: siblings.map((s) => s.id) } },
      });
      const completedCount = progressRows.filter((p) => p.completed).length + (existing?.completed ? 0 : 1);
      domainCompleted = completedCount >= siblings.length;
    }
  }

  res.json({
    passed,
    score: scorePercent,
    requiredScore: Math.round(PASS_THRESHOLD * 100),
    correctCount: correctQuestionIds.size,
    totalQuestions: questions.length,
    nextTopicId,
    domainCompleted,
  });
});

export default router;
