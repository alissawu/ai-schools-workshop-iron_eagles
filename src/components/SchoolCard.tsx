import type { School } from '../api';
import {
  calculateStudentTeacherRatio,
  calculateFRLPercent,
  getGradeLabel,
} from '../api';

interface SchoolCardProps {
  school: School;
  onClick?: () => void;
}

export function SchoolCard({ school, onClick }: SchoolCardProps) {
  const ratio = calculateStudentTeacherRatio(school.enrollment, school.teachers_fte);
  const frlPercent = calculateFRLPercent(school.free_or_reduced_price_lunch, school.enrollment);
  const gradeRange = `${getGradeLabel(school.lowest_grade_offered)} - ${getGradeLabel(school.highest_grade_offered)}`;

  return (
    <div
      className="school-card cursor-pointer hover:border-[var(--accent-blue)] transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold leading-tight">{school.school_name}</h4>
        <div className="flex gap-1 shrink-0">
          {school.charter === 1 && <span className="tag tag-charter">Charter</span>}
          {school.magnet === 1 && <span className="tag tag-magnet">Magnet</span>}
        </div>
      </div>

      <div className="text-sm text-[var(--text-secondary)] mb-3">
        {school.city_location} · Grades {gradeRange}
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-[var(--text-secondary)] text-xs">Students</div>
          <div className="font-medium">{school.enrollment?.toLocaleString() || 'N/A'}</div>
        </div>
        <div>
          <div className="text-[var(--text-secondary)] text-xs">Ratio</div>
          <div className="font-medium">{ratio ? `${ratio}:1` : 'N/A'}</div>
        </div>
        <div>
          <div className="text-[var(--text-secondary)] text-xs">FRL</div>
          <div className="font-medium">{frlPercent !== null ? `${frlPercent}%` : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}
