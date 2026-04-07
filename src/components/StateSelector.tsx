import { STATES } from '../api';

interface StateSelectorProps {
  value: string;
  onChange: (fips: string) => void;
}

export function StateSelector({ value, onChange }: StateSelectorProps) {
  const sortedStates = Object.entries(STATES).sort((a, b) =>
    a[1].name.localeCompare(b[1].name)
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="state-select w-full"
      aria-label="Select a state"
    >
      <option value="">Select a state...</option>
      {sortedStates.map(([abbr, { name, fips }]) => (
        <option key={abbr} value={fips}>
          {name}
        </option>
      ))}
    </select>
  );
}
