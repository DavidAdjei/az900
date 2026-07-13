import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const VALID_DOMAINS = ["CLOUD_CONCEPTS", "ARCHITECTURE_SERVICES", "MANAGEMENT_GOVERNANCE"];
const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

// GET /api/flashcards?domain=..&dueOnly=true
// Requires auth so we can attach each card's review state to the user.
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const domain = req.query.domain as string | undefined;
  const dueOnly = req.query.dueOnly === "true";

  if (domain && !VALID_DOMAINS.includes(domain)) {
    return res.status(400).json({ error: `domain must be one of ${VALID_DOMAINS.join(", ")}` });
  }

  const cards = await prisma.flashcard.findMany({
    where: domain ? { domain: domain as any } : undefined,
    include: {
      reviews: { where: { userId: req.userId as string } },
    },
  });

  const now = new Date();
  const shaped = cards
    .map((card: (typeof cards)[number]) => {
      const review = card.reviews[0];
      return {
        id: card.id,
        domain: card.domain,
        front: card.front,
        back: card.back,
        box: review?.box ?? 0,
        nextReviewAt: review?.nextReviewAt ?? now,
        isDue: !review || review.nextReviewAt <= now,
      };
    })
    .filter((c: { isDue: boolean }) => !dueOnly || c.isDue);

  res.json({ flashcards: shaped });
});

// POST /api/flashcards/:id/review  { grade: "again" | "good" }
router.post("/:id/review", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { grade } = req.body as { grade?: "again" | "good" };

  if (grade !== "again" && grade !== "good") {
    return res.status(400).json({ error: 'grade must be "again" or "good"' });
  }

  const card = await prisma.flashcard.findUnique({ where: { id } });
  if (!card) {
    return res.status(404).json({ error: "Flashcard not found" });
  }

  const existing = await prisma.flashcardReview.findUnique({
    where: { userId_flashcardId: { userId: req.userId as string, flashcardId: id } },
  });

  const currentBox = existing?.box ?? 0;
  const nextBox = grade === "again" ? 0 : Math.min(currentBox + 1, BOX_INTERVAL_DAYS.length - 1);
  const nextReviewAt = new Date(Date.now() + BOX_INTERVAL_DAYS[nextBox] * 24 * 60 * 60 * 1000);

  const updated = await prisma.flashcardReview.upsert({
    where: { userId_flashcardId: { userId: req.userId as string, flashcardId: id } },
    create: {
      userId: req.userId as string,
      flashcardId: id,
      box: nextBox,
      nextReviewAt,
      lastReviewedAt: new Date(),
    },
    update: {
      box: nextBox,
      nextReviewAt,
      lastReviewedAt: new Date(),
    },
  });

  res.json({ box: updated.box, nextReviewAt: updated.nextReviewAt });
});

export default router;
