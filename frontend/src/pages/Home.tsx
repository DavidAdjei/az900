import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DOMAIN_ORDER, DOMAINS } from "../domains";
import { DomainCard } from "../components/DomainCard";
import { useAuth } from "../context/AuthContext";
import { api, DomainSummary } from "../api/client";

const BAR_MAP: Record<string, string> = { wire: "bg-wire", signal: "bg-signal", node: "bg-node" };

export function Home() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DomainSummary[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getLearningDomains().then((d) => setDomains(d.domains)).catch(() => {});
  }, [user]);

  return (
    <div>
      <div className="mb-10">
        <p className="font-mono text-xs text-signal mb-3">EXAM AZ-900 · AZURE FUNDAMENTALS</p>
        <h1 className="font-display text-3xl font-semibold mb-3 max-w-xl">
          Three domains. One path. Complete each chapter to unlock the next.
        </h1>
        <p className="text-muted max-w-xl leading-relaxed mb-6">
          The guided Learning Path takes you through every domain in order — read a chapter, pass
          its check, and the next one unlocks. Notes, Deep Dive, Quiz, and Flashcards are there
          whenever you want extra practice.
        </p>
        <Link
          to="/learn"
          className="inline-block bg-signal text-invert font-medium rounded-md px-5 py-2.5"
        >
          {domains ? "Continue the Learning Path →" : "Start the Learning Path →"}
        </Link>
      </div>

      {user && domains && (
        <div className="border border-line rounded-lg bg-surface p-5 mb-10">
          <p className="font-mono text-xs text-muted mb-4">YOUR PROGRESS</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {DOMAIN_ORDER.map((id) => {
              const d = domains.find((x) => x.id === id);
              const meta = DOMAINS[id];
              const percent = d?.progressPercent ?? 0;
              return (
                <div key={id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted truncate">{meta.label}</span>
                    <span className="font-mono text-xs text-ink">{percent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-raised overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_MAP[meta.color]} transition-all`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {!d?.unlocked && <p className="text-xs text-muted mt-1.5">Locked</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DOMAIN_ORDER.map((id) => (
          <DomainCard key={id} id={id} />
        ))}
      </div>
    </div>
  );
}
