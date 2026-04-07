import type { DemographicBreakdown } from '../api';

interface DemographicsChartProps {
  demographics: DemographicBreakdown[];
}

export function DemographicsChart({ demographics }: DemographicsChartProps) {
  return (
    <div className="stat-card">
      <h3 className="font-semibold mb-4">Student Demographics</h3>

      {/* Stacked bar */}
      <div className="flex rounded-lg overflow-hidden h-8 mb-4">
        {demographics.map((d) => (
          <div
            key={d.race}
            className="transition-all duration-300"
            style={{
              width: `${d.percent}%`,
              backgroundColor: d.color,
              minWidth: d.percent > 0 ? '2px' : '0',
            }}
            title={`${d.label}: ${d.percent}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {demographics.map((d) => (
          <div key={d.race} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-[var(--text-secondary)] truncate">{d.label}</span>
            <span className="font-medium ml-auto">{d.percent}%</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--text-secondary)] mt-3">
        Source: CCD Enrollment by Race, 2022
      </p>
    </div>
  );
}
