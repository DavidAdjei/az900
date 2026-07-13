import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const VALID_DOMAINS = ["CLOUD_CONCEPTS", "ARCHITECTURE_SERVICES", "MANAGEMENT_GOVERNANCE"];

// GET /api/questions?domain=CLOUD_CONCEPTS&count=10
// Public: no auth required to browse questions, but attempts require login.
router.get("/", async (req, res) => {
  const domain = req.query.domain as string | undefined;
  const count = Math.min(parseInt((req.query.count as string) || "10", 10) || 10, 50);

  if (domain && !VALID_DOMAINS.includes(domain)) {
    return res.status(400).json({ error: `domain must be one of ${VALID_DOMAINS.join(", ")}` });
  }

  const all = await prisma.question.findMany({
    where: domain ? { domain: domain as any } : undefined,
  });

  // Shuffle and trim, strip the correct answer + explanation before sending.
  const shuffled = all.sort(() => Math.random() - 0.5).slice(0, count);
  const sanitized = shuffled.map((q: (typeof all)[number]) => ({
    id: q.id,
    domain: q.domain,
    prompt: q.prompt,
    choices: q.choices,
    multiSelect: q.multiSelect,
    diagramSvg: q.diagramSvg,
  }));

  res.json({ questions: sanitized });
});

// POST /api/questions/:id/attempt  { chosenChoiceIds: string[] }
// (For single-select questions, send an array with exactly one id.)
router.post("/:id/attempt", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { chosenChoiceIds } = req.body as { chosenChoiceIds?: string[] };

  if (!chosenChoiceIds || !Array.isArray(chosenChoiceIds) || chosenChoiceIds.length === 0) {
    return res.status(400).json({ error: "chosenChoiceIds (non-empty array) is required" });
  }

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  const correctIds: string[] = question.multiSelect
    ? ((question.correctChoiceIds as string[] | null) ?? [question.correctChoiceId])
    : [question.correctChoiceId];

  const correct =
    chosenChoiceIds.length === correctIds.length &&
    [...chosenChoiceIds].sort().join(",") === [...correctIds].sort().join(",");

  await prisma.attempt.create({
    data: {
      userId: req.userId as string,
      questionId: id,
      chosenChoiceId: chosenChoiceIds[0],
      chosenChoiceIds: chosenChoiceIds.length > 1 ? chosenChoiceIds : undefined,
      correct,
    },
  });

  res.json({
    correct,
    correctChoiceIds: correctIds,
    explanation: question.explanation,
  });
});

export default router;
