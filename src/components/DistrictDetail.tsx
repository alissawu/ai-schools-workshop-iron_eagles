import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { District, School } from '../api';
import {
  fetchSchoolsInDistrict,
  fetchDemographics,
  fetchNicheDistrict,
  calculateStudentTeacherRatio,
  getSchoolLevelLabel,
  getNicheDistrictUrl,
} from '../api';
import { LoadingSpinner } from './LoadingSpinner';
import { SchoolCard } from './SchoolCard';
import { SchoolModal } from './SchoolModal';
import { DemographicsChart } from './DemographicsChart';
import { MetricBar } from './MetricBar';

interface DistrictDetailProps {
  district: District;
  onBack: () => void;
}

export function DistrictDetail({ district, onBack }: DistrictDetailProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const { data: schools, isLoading } = useQuery({
    queryKey: ['schools', district.leaid],
    queryFn: () => fetchSchoolsInDistrict(district.leaid),
  });

  const { data: demographics } = useQuery({
    queryKey: ['demographics', district.leaid],
    queryFn: () => fetchDemographics(district.leaid),
  });

  const { data: nicheData, isLoading: nicheLoading } = useQuery({
    queryKey: ['niche-district', district.leaid],
    queryFn: () => fetchNicheDistrict(district.lea_name, district.state_mailing, district.leaid),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: false,
  });

  const ratio = calculateStudentTeacherRatio(district.enrollment, district.teachers_total_fte);

  // Group schools by level
  const schoolsByLevel = schools?.reduce((acc, school) => {
    const level = getSchoolLevelLabel(school.school_level);
    if (!acc[level]) acc[level] = [];
    acc[level].push(school);
    return acc;
  }, {} as Record<string, School[]>);

  // Calculate district-level FRL percentage from schools
  const totalFRL = schools?.reduce((sum, s) => sum + (s.free_or_reduced_price_lunch || 0), 0) || 0;
  const totalEnrollment = schools?.reduce((sum, s) => sum + (s.enrollment || 0), 0) || 0;
  const frlPercent = totalEnrollment > 0 ? Math.round((totalFRL / totalEnrollment) * 100) : null;

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
      {nicheData ? (
        <div className="stat-card mb-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-semibold">Niche Ratings</h3>
            <a
              href={nicheData.niche_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent-blue)] hover:underline"
            >
              View on Niche ↗
            </a>
          </div>
          
          {/* Overall Grade */}
          {nicheData.overall_grade && (
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
          )}
          
          {/* Category Grades */}
          {Object.keys(nicheData.grades).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {Object.entries(nicheData.grades).map(([key, grade]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`font-bold px-2 py-0.5 rounded text-sm ${
                    grade.startsWith('A') ? 'bg-green-500/20 text-green-400' :
                    grade.startsWith('B') ? 'bg-blue-500/20 text-blue-400' :
                    grade.startsWith('C') ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {grade}
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
          
          {/* Proficiency Scores */}
          {(nicheData.math_proficiency || nicheData.reading_proficiency || nicheData.graduation_rate) && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)] grid grid-cols-3 gap-4 text-center">
              {nicheData.math_proficiency && (
                <div>
                  <div className="text-2xl font-bold text-[var(--accent-blue)]">{nicheData.math_proficiency}%</div>
                  <div className="text-xs text-[var(--text-secondary)]">Math Proficient</div>
                </div>
              )}
              {nicheData.reading_proficiency && (
                <div>
                  <div className="text-2xl font-bold text-[var(--accent-purple)]">{nicheData.reading_proficiency}%</div>
                  <div className="text-xs text-[var(--text-secondary)]">Reading Proficient</div>
                </div>
              )}
              {nicheData.graduation_rate && (
                <div>
                  <div className="text-2xl font-bold text-[var(--accent-green)]">{nicheData.graduation_rate}%</div>
                  <div className="text-xs text-[var(--text-secondary)]">Graduation Rate</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : nicheLoading ? (
        <div className="stat-card mb-6 flex items-center gap-3">
          <LoadingSpinner />
          <span className="text-[var(--text-secondary)]">Loading Niche ratings...</span>
        </div>
      ) : (
        <a
          href={getNicheDistrictUrl(district.lea_name, district.state_mailing)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-[var(--accent-blue)] hover:underline mb-6"
        >
          View ratings & reviews on Niche ↗
        </a>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
        <div className="stat-card">
          <div className="text-4xl font-bold text-[var(--accent-yellow)]">
            {frlPercent !== null ? `${frlPercent}%` : 'N/A'}
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">Free/Reduced Lunch</div>
        </div>
      </div>

      {/* Metrics Visualization + Demographics */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
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
        <div className="stat-card">
          <h3 className="font-semibold mb-4">Free/Reduced Lunch Rate</h3>
          <MetricBar
            value={frlPercent || 0}
            max={100}
            label={frlPercent !== null ? `${frlPercent}% of students qualify` : 'Data not available'}
            color="var(--accent-yellow)"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            An indicator of socioeconomic diversity in the district
          </p>
        </div>
      </div>

      {/* Demographics */}
      {demographics && (
        <div className="mb-8">
          <DemographicsChart demographics={demographics} />
        </div>
      )}

      {/* Schools Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">
          Schools in this District
        </h2>

        {isLoading ? (
          <div className="flex flex-col items-center py-12">
            <LoadingSpinner />
            <p className="mt-4 text-[var(--text-secondary)]">Loading schools...</p>
          </div>
        ) : !schools || schools.length === 0 ? (
          <p className="text-[var(--text-secondary)] py-8">No school data available.</p>
        ) : (
          <div className="space-y-8">
            {['Elementary', 'Middle', 'High', 'Other'].map((level) => {
              const levelSchools = schoolsByLevel?.[level];
              if (!levelSchools || levelSchools.length === 0) return null;

              return (
                <div key={level}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        level === 'Elementary'
                          ? 'bg-[var(--accent-green)]'
                          : level === 'Middle'
                          ? 'bg-[var(--accent-yellow)]'
                          : level === 'High'
                          ? 'bg-[var(--accent-blue)]'
                          : 'bg-[var(--accent-purple)]'
                      }`}
                    />
                    {level} Schools ({levelSchools.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {levelSchools
                      .sort((a, b) => (b.enrollment || 0) - (a.enrollment || 0))
                      .map((school) => (
                        <SchoolCard
                          key={school.ncessch}
                          school={school}
                          onClick={() => setSelectedSchool(school)}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* School Modal */}
      {selectedSchool && (
        <SchoolModal
          school={selectedSchool}
          onClose={() => setSelectedSchool(null)}
        />
      )}
    </div>
  );
}
