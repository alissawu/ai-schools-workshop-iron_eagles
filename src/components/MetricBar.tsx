interface MetricBarProps {
  value: number;
  max: number;
  label: string;
  color: string;
  invertColor?: boolean;
}

export function MetricBar({ value, max, label, color, invertColor }: MetricBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  
  // For inverted metrics (like student:teacher ratio), lower is better
  const displayColor = invertColor
    ? percent < 50
      ? 'var(--accent-green)'
      : percent < 75
      ? 'var(--accent-yellow)'
      : 'var(--accent-red)'
    : color;

  return (
    <div>
      <div className="metric-bar">
        <div
          className="metric-bar-fill"
          style={{
            width: `${percent}%`,
            backgroundColor: displayColor,
          }}
        />
      </div>
      <div className="mt-2 text-sm text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}
