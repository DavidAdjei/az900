import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DOMAIN_ORDER, DomainId, DOMAINS } from "../domains";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

type Flashcard = { id: string; front: string; back: string; box: number; isDue: boolean };

const TAB_ACTIVE: Record<string, string> = {
  wire: "border-wire text-ink",
  signal: "border-signal text-ink",
  node: "border-node text-ink",
};
const TEXT_MAP: Record<string, string> = { wire: "text-wire", signal: "text-signal", node: "text-node" };
const DOT_MAP: Record<string, string> = { wire: "bg-wire", signal: "bg-signal", node: "bg-node" };

const BOX_LABELS = ["New", "Learning", "Familiar", "Known", "Strong", "Mastered"];

export function Flashcards() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const domain = (params.get("domain") as DomainId) || "CLOUD_CONCEPTS";
  const accent = DOMAINS[domain].color;

  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [dueOnly, setDueOnly] = useState(true);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionSeen, setSessionSeen] = useState(0);

  async function loadCards() {
    setLoading(true);
    setIndex(0);
    setFlipped(false);
    setSessionCorrect(0);
    setSessionSeen(0);
    const { flashcards } = await api.getFlashcards(domain, false);
    setAllCards(flashcards);
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, user]);

  const deck = dueOnly ? allCards.filter((c) => c.isDue) : allCards;
  const current = deck[index];
  const done = !loading && deck.length > 0 && index >= deck.length;

  async function handleGrade(grade: "again" | "good") {
    if (!current) return;
    await api.reviewFlashcard(current.id, grade);
    setSessionSeen((s) => s + 1);
    if (grade === "good") setSessionCorrect((s) => s + 1);
    setFlipped(false);
    // Small delay so the flip-back and card-swap don't visually collide.
    setTimeout(() => setIndex((i) => i + 1), 150);
  }

  if (!user) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold mb-4">Flashcards</h1>
        <div className="border border-line rounded-lg p-6 bg-surface max-w-md">
          <p className="text-muted mb-4 leading-relaxed">
            Sign in to review flashcards. Reviews use spaced repetition, so cards you know well
            show up less often.
          </p>
          <Link to="/login" className="inline-block bg-signal text-invert font-medium rounded-md px-4 py-2">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold">Flashcards</h1>
        <div className="flex gap-1 border border-line rounded-md p-0.5">
          <button
            onClick={() => setDueOnly(true)}
            className={`text-xs px-3 py-1 rounded ${dueOnly ? "bg-raised text-ink" : "text-muted"}`}
          >
            Due for review
          </button>
          <button
            onClick={() => setDueOnly(false)}
            className={`text-xs px-3 py-1 rounded ${!dueOnly ? "bg-raised text-ink" : "text-muted"}`}
          >
            All cards
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line mb-8">
        {DOMAIN_ORDER.map((id) => (
          <button
            key={id}
            onClick={() => setParams({ domain: id })}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              domain === id ? TAB_ACTIVE[DOMAINS[id].color] : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {DOMAINS[id].label}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted text-sm">Loading flashcards…</p>}

      {!loading && deck.length === 0 && (
        <div className="border border-line rounded-lg p-6 bg-surface max-w-md">
          <p className="text-muted mb-4">
            {dueOnly
              ? "Nothing due for review right now — nice work staying on top of this domain."
              : "No flashcards found for this domain."}
          </p>
          {dueOnly && (
            <button onClick={() => setDueOnly(false)} className="bg-signal text-invert font-medium rounded-md px-4 py-2">
              Review all cards anyway
            </button>
          )}
        </div>
      )}

      {!loading && done && (
        <div className="border border-line rounded-lg p-6 bg-surface max-w-md animate-card-in">
          <p className={`font-mono text-xs mb-2 ${TEXT_MAP[accent]}`}>SESSION COMPLETE</p>
          <p className="font-display text-3xl font-semibold mb-2">
            {sessionCorrect}/{sessionSeen}
          </p>
          <p className="text-sm text-muted mb-4">marked "got it" this round.</p>
          <button onClick={loadCards} className="bg-signal text-invert font-medium rounded-md px-4 py-2">
            Review again
          </button>
        </div>
      )}

      {!loading && !done && current && (
        <div className="max-w-md">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-xs text-muted">
              Card {index + 1} of {deck.length}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-muted">{BOX_LABELS[current.box]}</span>
              <div className="flex gap-0.5">
                {BOX_LABELS.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i <= current.box ? DOT_MAP[accent] : "bg-line"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="h-1 rounded-full bg-raised overflow-hidden mb-6">
            <div
              className={`h-full rounded-full ${DOT_MAP[accent]} transition-all`}
              style={{ width: `${(index / deck.length) * 100}%` }}
            />
          </div>

          {/* 3D flip card: .flip-scene sets perspective, .flip-card rotates on Y,
              and each face uses backface-visibility so only one side ever shows. */}
          <div className="flip-scene animate-card-in" key={current.id}>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="flip-card relative w-full text-left"
              style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              <div className="flip-face border border-line rounded-lg bg-surface px-6 py-16 text-center hover:border-muted transition-colors min-h-[220px] flex flex-col items-center justify-center">
                <p className="font-mono text-xs text-muted mb-4">TERM</p>
                <p className="text-lg leading-relaxed">{current.front}</p>
                <p className="font-mono text-xs text-muted mt-6">Tap to reveal</p>
              </div>
              <div className={`flip-face flip-face-back border rounded-lg bg-surface px-6 py-16 text-center min-h-[220px] flex flex-col items-center justify-center ${TAB_ACTIVE[accent]}`}>
                <p className={`font-mono text-xs mb-4 ${TEXT_MAP[accent]}`}>DEFINITION</p>
                <p className="text-base leading-relaxed">{current.back}</p>
                <p className="font-mono text-xs text-muted mt-6">Tap to flip back</p>
              </div>
            </button>
          </div>

          {flipped && (
            <div className="flex gap-3 mt-5 animate-card-in">
              <button
                onClick={() => handleGrade("again")}
                className="flex-1 border border-line rounded-md py-2.5 text-sm hover:border-red-400 hover:text-red-400 transition-colors"
              >
                Still learning
              </button>
              <button
                onClick={() => handleGrade("good")}
                className="flex-1 border border-wire text-wire rounded-md py-2.5 text-sm hover:bg-wire/10 transition-colors"
              >
                Got it
              </button>
            </div>
          )}
          {!flipped && <div className="h-[46px] mt-5" />}
        </div>
      )}
    </div>
  );
}
