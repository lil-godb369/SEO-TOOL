import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}

function colorFor(score: number) {
  if (score >= 80) return "var(--good)";
  if (score >= 50) return "var(--warning)";
  return "var(--error)";
}

export function ScoreRing({
  score,
  size = 160,
  stroke = 12,
  label,
}: ScoreRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const color = colorFor(clamped);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn("font-bold tabular-nums")}
          style={{ fontSize: size * 0.28, color }}
        >
          {clamped}
        </span>
        {label && (
          <span className="text-xs font-medium text-muted">{label}</span>
        )}
      </div>
    </div>
  );
}
