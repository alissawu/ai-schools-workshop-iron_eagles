import type { District } from '../api';
import { calculateStudentTeacherRatio, getGradeLabel } from '../api';

interface DistrictCardProps {
  district: District;
  onClick: () => void;
  stateAvgRatio: number;
}

export function DistrictCard({ district, onClick, stateAvgRatio }: DistrictCardProps) {
  const ratio = calculateStudentTeacherRatio(district.enrollment, district.teachers_total_fte);
  const ratioVsAvg = ratio && stateAvgRatio ? ((ratio - stateAvgRatio) / stateAvgRatio) * 100 : null;

  const gradeRange = `${getGradeLabel(district.lowest_grade_offered)} - ${getGradeLabel(district.highest_grade_offered)}`;

  return (
    <div className="district-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg leading-tight pr-2">{district.lea_name}</h3>
        <span className="tag tag-public shrink-0">Public</span>
      </div>
      
      <div className="text-sm text-[var(--text-secondary)] mb-4">
        {district.city_mailing}, {district.state_mailing}
        {district.county_name && ` · ${district.county_name}`}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-[var(--text-secondary)]">Students</div>
          <div className="font-semibold text-lg">
            {district.enrollment?.toLocaleString() || 'N/A'}
          </div>
        </div>
        <div>
          <div className="text-[var(--text-secondary)]">Schools</div>
          <div className="font-semibold text-lg">{district.number_of_schools}</div>
        </div>
        <div>
          <div className="text-[var(--text-secondary)]">Student:Teacher</div>
          <div className="font-semibold text-lg flex items-center gap-2">
            {ratio ? `${ratio}:1` : 'N/A'}
            {ratioVsAvg !== null && (
              <span
                className={`text-xs ${
                  ratioVsAvg < 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-yellow)]'
                }`}
              >
                {ratioVsAvg > 0 ? '+' : ''}{ratioVsAvg.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[var(--text-secondary)]">Grades</div>
          <div className="font-semibold text-lg">{gradeRange}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border)] text-sm text-[var(--accent-blue)]">
        View schools & details →
      </div>
    </div>
  );
}
