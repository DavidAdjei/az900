import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { DOMAIN_ORDER, DOMAINS } from "../domains";
import { useAuth } from "../context/AuthContext";
import { api, DomainSummary } from "../api/client";

const BAR_MAP: Record<string, string> = { wire: "bg-wire", signal: "bg-signal", node: "bg-node" };
const DOT_MAP: Record<string, string> = { wire: "bg-wire", signal: "bg-signal", node: "bg-node" };
const TEXT_MAP: Record<string, string> = { wire: "text-wire", signal: "text-signal", node: "text-node" };

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-raised overflow-hidden">
      <div
        className={`h-full rounded-full ${BAR_MAP[color]} transition-all`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function LearningPath() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DomainSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getLearningDomains()
      .then((d) => setDomains(d.domains))
      .catch((e) => setError(e.message));
  }, [user]);

  if (!user) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold mb-4">Learning Path</h1>
        <div className="border border-line rounded-lg p-6 bg-surface max-w-md">
          <p className="text-muted mb-4 leading-relaxed">
            Sign in to start the guided course — chapters unlock one at a time as you pass each
            chapter's check, and your progress is saved.
          </p>
          <Link to="/login" className="inline-block bg-signal text-invert font-medium rounded-md px-4 py-2">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const overallCompleted = domains?.reduce((s, d) => s + d.completedChapters, 0) ?? 0;
  const overallTotal = domains?.reduce((s, d) => s + d.totalChapters, 0) ?? 0;
  const overallPercent = overallTotal ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs text-signal mb-3">GUIDED COURSE</p>
        <h1 className="font-display text-2xl font-semibold mb-2">Learning Path</h1>
        <p className="text-muted max-w-xl leading-relaxed mb-4">
          Work through each domain in order. Every chapter ends with a short check — score at
          least 70% to unlock the next one.
        </p>
        {domains && (
          <div className="max-w-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-muted">EXAM READINESS</span>
              <span className="font-mono text-xs text-ink">{overallPercent}%</span>
            </div>
            <ProgressBar percent={overallPercent} color="signal" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-signal mb-4">{error}</p>}
      {!domains && !error && <p className="text-sm text-muted">Loading your progress…</p>}

      <div className="space-y-6">
        {domains?.map((d) => {
          const meta = DOMAINS[d.id as keyof typeof DOMAINS];
          return (
            <div
              key={d.id}
              className={`border border-line rounded-lg bg-surface overflow-hidden ${!d.unlocked ? "opacity-60" : ""}`}
            >
              <div className="px-5 py-4 border-b border-line">
                <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full inline-block ${DOT_MAP[meta.color]}`} />
                    <h2 className="font-display font-semibold">{meta.label}</h2>
                    <span className="font-mono text-xs text-muted">{meta.weight}</span>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {d.completedChapters}/{d.totalChapters} chapters
                  </span>
                </div>
                <ProgressBar percent={d.progressPercent} color={meta.color} />
                {!d.unlocked && (
                  <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
                    <LockIcon /> Complete the previous domain to unlock this one.
                  </p>
                )}
              </div>

              <div className="divide-y divide-line">
                {d.chapters.map((c, i) => {
                  const clickable = c.unlocked;
                  const content = (
                    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                            c.completed
                              ? `${BAR_MAP[meta.color]} text-invert`
                              : c.unlocked
                              ? "border border-line text-muted"
                              : "border border-line text-muted"
                          }`}
                        >
                          {c.completed ? <CheckIcon /> : !c.unlocked ? <LockIcon /> : i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${c.unlocked ? "text-ink" : "text-muted"}`}>{c.name}</p>
                          <p className="font-mono text-xs text-muted">
                            {c.conceptCount} concepts · {c.quizQuestionCount} check questions
                            {c.completed ? ` · scored ${c.bestScore}%` : ""}
                          </p>
                        </div>
                      </div>
                      {clickable && (
                        <span className={`font-mono text-xs shrink-0 ${TEXT_MAP[meta.color]}`}>
                          {c.completed ? "Review →" : "Start →"}
                        </span>
                      )}
                    </div>
                  );

                  return clickable ? (
                    <Link key={c.id} to={`/learn/${c.id}`} className="block hover:bg-raised transition-colors">
                      {content}
                    </Link>
                  ) : (
                    <div key={c.id} className="cursor-not-allowed">
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
