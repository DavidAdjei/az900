import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DOMAIN_ORDER, DOMAINS } from "../domains";
import { useAuth } from "../context/AuthContext";
import { api, ExamEligibility, ExamHistoryEntry } from "../api/client";

const BAR_MAP: Record<string, string> = { wire: "bg-wire", signal: "bg-signal", node: "bg-node" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ExamLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [eligibility, setEligibility] = useState<ExamEligibility | null>(null);
  const [history, setHistory] = useState<ExamHistoryEntry[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getExamEligibility().then(setEligibility).catch((e) => setError(e.message));
    api.getExamHistory().then((h) => setHistory(h.sessions)).catch(() => {});
  }, [user]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const { sessionId } = await api.startExam();
      navigate(`/exam/${sessionId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  if (!user) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold mb-4">Practice Exam</h1>
        <p className="text-muted">
          <Link to="/login" className="text-signal">
            Sign in
          </Link>{" "}
          to access the practice exam.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs text-signal mb-3">FULL MOCK EXAM</p>
      <h1 className="font-display text-2xl font-semibold mb-3">Practice Exam</h1>
      <p className="text-muted leading-relaxed mb-8">
        60 questions drawn from a pool of 100+, sampled proportionally across all three domains,
        with a 2-hour timer — the same conditions as the real thing. Available once you've
        completed every chapter in the Learning Path. Your progress is saved as you go, so if you
        accidentally close the tab, you'll pick up right where you left off.
      </p>

      {error && <p className="text-sm text-signal mb-4">{error}</p>}

      {!eligibility && !error && <p className="text-sm text-muted">Checking eligibility…</p>}

      {eligibility && (
        <div className="border border-line rounded-lg bg-surface p-6 mb-8">
          {eligibility.activeSessionId ? (
            <>
              <p className="font-mono text-xs text-signal mb-2">EXAM IN PROGRESS</p>
              <p className="text-sm text-muted mb-4">
                You have an unfinished attempt with time still on the clock.
              </p>
              <button
                onClick={() => navigate(`/exam/${eligibility.activeSessionId}`)}
                className="bg-signal text-invert font-medium rounded-md px-5 py-2.5"
              >
                Resume exam →
              </button>
            </>
          ) : eligibility.eligible ? (
            <>
              <p className="font-mono text-xs text-wire mb-2">READY</p>
              <p className="text-sm text-muted mb-4">
                You've completed every domain. Make sure you have two uninterrupted hours before
                you start — the timer can't be paused.
              </p>
              <button
                onClick={handleStart}
                disabled={starting}
                className="bg-signal text-invert font-medium rounded-md px-5 py-2.5 disabled:opacity-50"
              >
                {starting ? "Starting…" : "Start practice exam →"}
              </button>
            </>
          ) : (
            <>
              <p className="font-mono text-xs text-muted mb-3">LOCKED</p>
              <p className="text-sm text-muted mb-4">
                Complete every chapter in all three domains to unlock the practice exam.
              </p>
              <div className="space-y-3 mb-4">
                {DOMAIN_ORDER.map((id) => {
                  const d = eligibility.domains.find((x) => x.id === id);
                  const meta = DOMAINS[id];
                  const percent = d?.progressPercent ?? 0;
                  return (
                    <div key={id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted">{meta.label}</span>
                        <span className="font-mono text-xs text-ink">{percent}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-raised overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAR_MAP[meta.color]} transition-all`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link to="/learn" className="font-mono text-xs text-signal">
                Continue the Learning Path →
              </Link>
            </>
          )}
        </div>
      )}

      {history && history.length > 0 && (
        <div>
          <p className="font-mono text-xs text-muted mb-3">PAST ATTEMPTS</p>
          <div className="border border-line rounded-lg bg-surface divide-y divide-line overflow-hidden">
            {history.map((h) => (
              <Link
                key={h.id}
                to={`/exam/${h.id}/review`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-raised transition-colors"
              >
                <div>
                  <p className="text-sm text-ink">
                    {h.correctCount}/{h.totalQuestions} correct
                    {h.status === "EXPIRED" && <span className="text-muted"> · timed out</span>}
                  </p>
                  <p className="font-mono text-xs text-muted">{formatDate(h.startedAt)}</p>
                </div>
                <p className={`font-display text-xl font-semibold ${(h.score ?? 0) >= 70 ? "text-wire" : "text-muted"}`}>
                  {h.score}%
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
