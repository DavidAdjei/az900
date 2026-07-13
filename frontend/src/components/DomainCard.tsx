import { Link } from "react-router-dom";
import { DomainId, DOMAINS } from "../domains";

const BORDER_MAP: Record<string, string> = {
  wire: "hover:border-wire",
  signal: "hover:border-signal",
  node: "hover:border-node",
};

const DOT_MAP: Record<string, string> = {
  wire: "bg-wire",
  signal: "bg-signal",
  node: "bg-node",
};

const TEXT_MAP: Record<string, string> = {
  wire: "text-wire",
  signal: "text-signal",
  node: "text-node",
};

export function DomainCard({ id }: { id: DomainId }) {
  const domain = DOMAINS[id];
  return (
    <div
      className={`border border-line rounded-lg p-5 bg-surface transition-colors ${BORDER_MAP[domain.color]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`w-2 h-2 rounded-full inline-block ${DOT_MAP[domain.color]}`} />
        <span className="font-mono text-xs text-muted">{domain.weight}</span>
      </div>
      <h3 className="font-display font-semibold mb-2">{domain.label}</h3>
      <p className="text-sm text-muted mb-4 leading-relaxed">{domain.blurb}</p>
      <div className="flex gap-3 text-sm flex-wrap">
        <Link to={`/learn`} className={`font-medium ${TEXT_MAP[domain.color]}`}>
          Learn →
        </Link>
        <Link to={`/quiz?domain=${id}`} className="text-ink hover:text-signal transition-colors">
          Quiz
        </Link>
        <Link
          to={`/flashcards?domain=${id}`}
          className="text-ink hover:text-signal transition-colors"
        >
          Flashcards
        </Link>
      </div>
    </div>
  );
}
