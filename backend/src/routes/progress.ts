import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const DOMAINS = ["CLOUD_CONCEPTS", "ARCHITECTURE_SERVICES", "MANAGEMENT_GOVERNANCE"] as const;

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId as string;

  const domainStats = await Promise.all(
    DOMAINS.map(async (domain) => {
      const attempts = await prisma.attempt.findMany({
        where: { userId, question: { domain } },
      });
      const totalQuestions = await prisma.question.count({ where: { domain } });
      const correct = attempts.filter((a: (typeof attempts)[number]) => a.correct).length;

      const cards = await prisma.flashcard.findMany({
        where: { domain },
        include: { reviews: { where: { userId } } },
      });
      const learned = cards.filter((c: (typeof cards)[number]) => (c.reviews[0]?.box ?? 0) >= 3).length;

      return {
        domain,
        questionsAttempted: attempts.length,
        totalQuestions,
        correct,
        accuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
        flashcardsLearned: learned,
        totalFlashcards: cards.length,
      };
    })
  );

  res.json({ domains: domainStats });
});

export default router;
