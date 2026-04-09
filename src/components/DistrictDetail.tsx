import { useQuery } from '@tanstack/react-query';
import type { District } from '../api';
import {
  fetchNicheDistrict,
  calculateStudentTeacherRatio,
  getNicheDistrictUrl,
} from '../api';
import { LoadingSpinner } from './LoadingSpinner';
import { MetricBar } from './MetricBar';

interface DistrictDetailProps {
  district: District;
  onBack: () => void;
}

export function DistrictDetail({ district, onBack }: DistrictDetailProps) {
  const { data: nicheData, isLoading: nicheLoading } = useQuery({
    queryKey: ['niche-district', district.leaid],
    queryFn: () => fetchNicheDistrict(district.lea_name, district.state_mailing, district.leaid),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const ratio = calculateStudentTeacherRatio(district.enrollment, district.teachers_total_fte);

  return (
    <div className="fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        <span>←</span>
        <span>Back to districts</span>
      </button>

      {/* District Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl italic mb-2">{district.lea_name}</h1>
        <p className="text-[var(--text-secondary)] text-lg">
          {district.city_mailing}, {district.state_mailing}
          {district.county_name && ` · ${district.county_name}`}
        </p>
      </div>

      {/* Niche Ratings */}
      <div className="stat-card mb-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold">Niche Ratings</h3>
          <a
            href={nicheData?.niche_url || getNicheDistrictUrl(district.lea_name, district.state_mailing)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--accent-blue)] hover:underline"
          >
            View on Niche ↗
          </a>
        </div>
        
        {nicheLoading ? (
          <div className="flex items-center gap-3">
            <LoadingSpinner />
            <span className="text-[var(--text-secondary)]">Loading ratings...</span>
          </div>
        ) : nicheData?.overall_grade ? (
          <>
            {/* Overall Grade */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-4xl font-bold px-4 py-2 rounded-lg ${
                nicheData.overall_grade.startsWith('A') ? 'bg-green-500/20 text-green-400' :
                nicheData.overall_grade.startsWith('B') ? 'bg-blue-500/20 text-blue-400' :
                nicheData.overall_grade.startsWith('C') ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {nicheData.overall_grade}
              </div>
              <div className="text-[var(--text-secondary)]">Overall Niche Grade</div>
            </div>
            
            {/* Category Grades */}
            {Object.keys(nicheData.grades || {}).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {Object.entries(nicheData.grades).map(([key, grade]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`font-bold px-2 py-0.5 rounded text-sm ${
                      (grade as string).startsWith('A') ? 'bg-green-500/20 text-green-400' :
                      (grade as string).startsWith('B') ? 'bg-blue-500/20 text-blue-400' :
                      (grade as string).startsWith('C') ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {grade as string}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Reviews */}
            {nicheData.reviews && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="text-yellow-400">★</span>
                <span>{nicheData.reviews.average.toFixed(1)}/5</span>
                <span>·</span>
                <span>{nicheData.reviews.count} reviews</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-[var(--text-secondary)]">Click the link above to view ratings on Niche</p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <div className="text-4xl font-bold text-[var(--accent-blue)]">
            {district.enrollment?.toLocaleString() || 'N/A'}
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">Total Students</div>
        </div>
        <div className="stat-card">
          <div className="text-4xl font-bold text-[var(--accent-purple)]">
            {district.number_of_schools}
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">Schools</div>
        </div>
        <div className="stat-card">
          <div className="text-4xl font-bold text-[var(--accent-green)]">
            {ratio ? `${ratio}:1` : 'N/A'}
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">Student:Teacher Ratio</div>
        </div>
      </div>

      {/* Ratio Visualization */}
      <div className="stat-card">
        <h3 className="font-semibold mb-4">Student:Teacher Ratio</h3>
        <MetricBar
          value={ratio || 0}
          max={30}
          label={ratio ? `${ratio} students per teacher` : 'Data not available'}
          color="var(--accent-green)"
          invertColor={true}
        />
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          Lower ratios generally indicate more individualized attention
        </p>
      </div>

      {/* Data Attribution */}
      <p className="text-center text-sm text-[var(--text-secondary)] mt-8">
        District data from{' '}
        <a href="https://nces.ed.gov/ccd/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] hover:underline">
          NCES Common Core of Data
        </a>
        {' '}(2022-23). Ratings from{' '}
        <a href="https://www.niche.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] hover:underline">
          Niche
        </a>.
      </p>
    </div>
  );
}
