import { prisma } from "./prisma";

export const DOMAIN_ORDER = ["CLOUD_CONCEPTS", "ARCHITECTURE_SERVICES", "MANAGEMENT_GOVERNANCE"] as const;
export type DomainId = (typeof DOMAIN_ORDER)[number];

export const PASS_THRESHOLD = 0.7; // 70% correct required to complete a chapter

/**
 * Computes, for a given user, which domains and which chapters (topics) are unlocked.
 *
 * Rules:
 *  - The first domain is always unlocked.
 *  - A later domain unlocks only once every chapter in every earlier domain is completed.
 *  - Within an unlocked domain, the first chapter (by sortOrder) is always unlocked.
 *  - Any other chapter unlocks only once the immediately preceding chapter (by sortOrder,
 *    within the same domain) is completed.
 *  - Every chapter in a locked domain is locked, regardless of individual completion.
 */
export async function getLearningState(userId: string) {
  const topics = await prisma.topic.findMany({
    orderBy: [{ domain: "asc" }, { sortOrder: "asc" }],
    include: {
      _count: { select: { concepts: true, quizQuestions: true } },
    },
  });

  const progressRows = await prisma.chapterProgress.findMany({ where: { userId } });
  const progressByTopic = new Map(progressRows.map((p) => [p.topicId, p]));

  const topicsByDomain = new Map<DomainId, typeof topics>();
  for (const t of topics) {
    const domain = t.domain as DomainId;
    if (!topicsByDomain.has(domain)) topicsByDomain.set(domain, []);
    topicsByDomain.get(domain)!.push(t);
  }

  const domainUnlocked = new Map<DomainId, boolean>();
  const chapterUnlocked = new Map<string, boolean>();
  const domainSummaries: Array<{
    id: DomainId;
    unlocked: boolean;
    totalChapters: number;
    completedChapters: number;
    progressPercent: number;
    chapters: Array<{
      id: string;
      name: string;
      sortOrder: number;
      unlocked: boolean;
      completed: boolean;
      bestScore: number;
      conceptCount: number;
      quizQuestionCount: number;
    }>;
  }> = [];

  let previousDomainFullyComplete = true; // first domain always unlocked

  for (const domainId of DOMAIN_ORDER) {
    const domainTopics = (topicsByDomain.get(domainId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    const isDomainUnlocked = previousDomainFullyComplete;
    domainUnlocked.set(domainId, isDomainUnlocked);

    let previousChapterComplete = true; // first chapter in an unlocked domain is always unlocked
    let completedCount = 0;
    const chapters = domainTopics.map((t) => {
      const progress = progressByTopic.get(t.id);
      const completed = progress?.completed ?? false;
      if (completed) completedCount++;

      const unlocked = isDomainUnlocked && previousChapterComplete;
      chapterUnlocked.set(t.id, unlocked);
      previousChapterComplete = completed;

      return {
        id: t.id,
        name: t.name,
        sortOrder: t.sortOrder,
        unlocked,
        completed,
        bestScore: progress?.bestScore ?? 0,
        conceptCount: t._count.concepts,
        quizQuestionCount: t._count.quizQuestions,
      };
    });

    const domainFullyComplete = domainTopics.length > 0 && completedCount === domainTopics.length;
    previousDomainFullyComplete = domainFullyComplete;

    domainSummaries.push({
      id: domainId,
      unlocked: isDomainUnlocked,
      totalChapters: domainTopics.length,
      completedChapters: completedCount,
      progressPercent: domainTopics.length ? Math.round((completedCount / domainTopics.length) * 100) : 0,
      chapters,
    });
  }

  return { domains: domainSummaries, domainUnlocked, chapterUnlocked };
}

/** Returns whether a specific chapter (topic) is unlocked for this user, plus its domain. */
export async function isChapterUnlocked(userId: string, topicId: string) {
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) return { exists: false as const };

  const state = await getLearningState(userId);
  const unlocked = state.chapterUnlocked.get(topicId) ?? false;
  return { exists: true as const, unlocked, domain: topic.domain as DomainId, topic };
}
