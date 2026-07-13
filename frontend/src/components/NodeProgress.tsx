const COLOR_MAP: Record<string, string> = {
  wire: "#4FADA6",
  signal: "#E8A33D",
  node: "#8B7FD1",
};

export function NodeProgress({
  percent,
  color,
  nodeCount = 10,
}: {
  percent: number;
  color: string;
  nodeCount?: number;
}) {
  const litNodes = Math.round((percent / 100) * nodeCount);
  const hex = COLOR_MAP[color] || COLOR_MAP.wire;
  const spacing = 100 / (nodeCount - 1);

  return (
    <svg viewBox="0 0 100 16" className="w-full h-4" preserveAspectRatio="none">
      {Array.from({ length: nodeCount - 1 }).map((_, i) => (
        <line
          key={`line-${i}`}
          x1={i * spacing}
          y1={8}
          x2={(i + 1) * spacing}
          y2={8}
          stroke={i < litNodes - 1 ? hex : "#2A3644"}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: nodeCount }).map((_, i) => (
        <circle
          key={`node-${i}`}
          cx={i * spacing}
          cy={8}
          r={i < litNodes ? 4 : 3}
          fill={i < litNodes ? hex : "#171F29"}
          stroke={i < litNodes ? hex : "#2A3644"}
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}
