import { useEffect, useState } from "react";
import { DOMAINS, DomainId } from "../domains";
import { NodeProgress } from "../components/NodeProgress";
import { api } from "../api/client";

type DomainStat = {
  domain: DomainId;
  questionsAttempted: number;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  flashcardsLearned: number;
  totalFlashcards: number;
};

export function Progress() {
  const [stats, setStats] = useState<DomainStat[] | null>(null);

  useEffect(() => {
    api.getProgress().then((res) => setStats(res.domains));
  }, []);

  if (!stats) return <p className="text-muted text-sm">Loading progress…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-2">Your progress</h1>
      <p className="text-muted mb-8">A quick read on which domain still needs work.</p>

      <div className="space-y-6">
        {stats.map((stat) => {
          const domain = DOMAINS[stat.domain];
          const flashcardPct = stat.totalFlashcards
            ? Math.round((stat.flashcardsLearned / stat.totalFlashcards) * 100)
            : 0;

          return (
            <div key={stat.domain} className="border border-line rounded-lg p-5 bg-surface">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold">{domain.label}</h2>
                <span className="font-mono text-xs text-muted">{domain.weight}</span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted mb-2 font-mono">
                    QUIZ ACCURACY — {stat.accuracy}% ({stat.correct}/{stat.questionsAttempted || 0} attempted, {stat.totalQuestions} total)
                  </p>
                  <NodeProgress percent={stat.accuracy} color={domain.color} />
                </div>
                <div>
                  <p className="text-xs text-muted mb-2 font-mono">
                    FLASHCARDS LEARNED — {stat.flashcardsLearned}/{stat.totalFlashcards}
                  </p>
                  <NodeProgress percent={flashcardPct} color={domain.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
