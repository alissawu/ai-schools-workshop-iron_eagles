import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { School } from '../api';
import {
  calculateStudentTeacherRatio,
  calculateFRLPercent,
  getSchoolLevelLabel,
  getGradeLabel,
  getNicheSchoolUrl,
  fetchNicheSchool,
} from '../api';
import { LoadingSpinner } from './LoadingSpinner';

interface SchoolModalProps {
  school: School;
  onClose: () => void;
}

export function SchoolModal({ school, onClose }: SchoolModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const { data: nicheData, isLoading: nicheLoading } = useQuery({
    queryKey: ['niche-school', school.ncessch],
    queryFn: () => fetchNicheSchool(school.school_name, school.city_location, school.state_location, school.ncessch),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const ratio = calculateStudentTeacherRatio(school.enrollment, school.teachers_fte);
  const frlPercent = calculateFRLPercent(school.free_or_reduced_price_lunch, school.enrollment);
  const gradeRange = `${getGradeLabel(school.lowest_grade_offered)} - ${getGradeLabel(school.highest_grade_offered)}`;
  const levelLabel = getSchoolLevelLabel(school.school_level);

  const tags: string[] = [];
  if (school.charter === 1) tags.push('Charter');
  if (school.magnet === 1) tags.push('Magnet');

  const ncesschUrl = `https://educationdata.urban.org/data-explorer/schools?ncessch=${school.ncessch}`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[var(--bg-primary)] rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl italic leading-tight">{school.school_name}</h2>
              <p className="text-[var(--text-secondary)] mt-1">
                {school.city_location}, {school.state_location} {school.zip_location}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none shrink-0 mt-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-2 mt-3">
              {tags.map((tag) => (
                <span key={tag} className={`tag ${tag === 'Charter' ? 'tag-charter' : 'tag-magnet'}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="p-6 space-y-6">
          {/* Overview grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <div className="text-2xl font-bold text-[var(--accent-blue)]">
                {school.enrollment?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Total Students</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-bold text-[var(--accent-green)]">
                {ratio ? `${ratio}:1` : 'N/A'}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Student:Teacher</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-bold text-[var(--accent-yellow)]">
                {frlPercent !== null ? `${frlPercent}%` : 'N/A'}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Free/Reduced Lunch</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-bold text-[var(--accent-purple)]">
                {levelLabel}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">School Level</div>
            </div>
          </div>

          {/* Niche Ratings */}
          {nicheData ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-[var(--text-secondary)] uppercase tracking-wider">Niche Ratings</h3>
              <div className="flex items-center gap-3">
                {nicheData.overall_grade && (
                  <div className={`text-2xl font-bold px-3 py-1 rounded ${
                    nicheData.overall_grade.startsWith('A') ? 'bg-green-500/20 text-green-400' :
                    nicheData.overall_grade.startsWith('B') ? 'bg-blue-500/20 text-blue-400' :
                    nicheData.overall_grade.startsWith('C') ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {nicheData.overall_grade}
                  </div>
                )}
                {nicheData.reviews && (
                  <div className="text-sm text-[var(--text-secondary)]">
                    <span className="text-yellow-400">★</span> {nicheData.reviews.average.toFixed(1)}/5 ({nicheData.reviews.count} reviews)
                  </div>
                )}
              </div>
              {Object.keys(nicheData.grades).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(nicheData.grades).slice(0, 6).map(([key, grade]) => (
                    <span key={key} className={`text-xs px-2 py-1 rounded ${
                      grade.startsWith('A') ? 'bg-green-500/20 text-green-400' :
                      grade.startsWith('B') ? 'bg-blue-500/20 text-blue-400' :
                      grade.startsWith('C') ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {key.replace(/_/g, ' ')}: {grade}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : nicheLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <LoadingSpinner />
              <span>Loading Niche ratings...</span>
            </div>
          ) : null}

          {/* Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[var(--text-secondary)] uppercase tracking-wider">Details</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <span className="text-[var(--text-secondary)]">Grades</span>
                <div className="font-medium">{gradeRange}</div>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Teachers (FTE)</span>
                <div className="font-medium">{school.teachers_fte?.toFixed(1) || 'N/A'}</div>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Free Lunch</span>
                <div className="font-medium">{school.free_lunch?.toLocaleString() ?? 'N/A'}</div>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Reduced Lunch</span>
                <div className="font-medium">{school.reduced_price_lunch?.toLocaleString() ?? 'N/A'}</div>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">District</span>
                <div className="font-medium">{school.lea_name}</div>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">NCES ID</span>
                <div className="font-medium font-mono text-xs">{school.ncessch}</div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border)]">
            <a
              href={nicheData?.niche_url || getNicheSchoolUrl(school.school_name, school.city_location, school.state_location)}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-[var(--accent-blue)] hover:underline py-1"
            >
              View on Niche ↗
            </a>
            <a
              href={ncesschUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-[var(--text-secondary)] hover:underline py-1"
            >
              View on Education Data Explorer ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
