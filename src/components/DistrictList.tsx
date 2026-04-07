import { useQuery } from '@tanstack/react-query';
import type { District } from '../api';
import { fetchDistricts, calculateStudentTeacherRatio } from '../api';
import { DistrictCard } from './DistrictCard';
import { LoadingSpinner } from './LoadingSpinner';

interface DistrictListProps {
  stateFips: string;
  searchQuery: string;
  onSelectDistrict: (district: District) => void;
}

export function DistrictList({ stateFips, searchQuery, onSelectDistrict }: DistrictListProps) {
  const { data: districts, isLoading, error } = useQuery({
    queryKey: ['districts', stateFips],
    queryFn: () => fetchDistricts(parseInt(stateFips)),
    enabled: !!stateFips,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <LoadingSpinner />
        <p className="mt-4 text-[var(--text-secondary)]">Loading districts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
        <p className="text-[var(--text-secondary)]">
          Failed to fetch district data. Please try again.
        </p>
      </div>
    );
  }

  if (!districts || districts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">📭</div>
        <h2 className="text-xl font-semibold mb-2">No Districts Found</h2>
        <p className="text-[var(--text-secondary)]">
          No school districts found for this state.
        </p>
      </div>
    );
  }

  // Filter districts based on search
  const query = searchQuery.toLowerCase().trim();
  const filteredDistricts = query
    ? districts.filter(
        (d) =>
          d.lea_name.toLowerCase().includes(query) ||
          d.city_mailing.toLowerCase().includes(query) ||
          d.county_name?.toLowerCase().includes(query)
      )
    : districts;

  // Sort by enrollment (largest first)
  const sortedDistricts = [...filteredDistricts].sort(
    (a, b) => (b.enrollment || 0) - (a.enrollment || 0)
  );

  // Calculate state averages for comparison
  const avgEnrollment = districts.reduce((sum, d) => sum + (d.enrollment || 0), 0) / districts.length;
  const avgRatio = districts.reduce((sum, d) => {
    const ratio = calculateStudentTeacherRatio(d.enrollment, d.teachers_total_fte);
    return sum + (ratio || 0);
  }, 0) / districts.filter(d => d.teachers_total_fte).length;

  return (
    <div className="fade-in">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="text-3xl font-bold">{districts.length}</div>
          <div className="text-sm text-[var(--text-secondary)]">Total Districts</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl font-bold">
            {districts.reduce((sum, d) => sum + (d.enrollment || 0), 0).toLocaleString()}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Total Students</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl font-bold">{Math.round(avgEnrollment).toLocaleString()}</div>
          <div className="text-sm text-[var(--text-secondary)]">Avg Enrollment</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl font-bold">{avgRatio.toFixed(1)}:1</div>
          <div className="text-sm text-[var(--text-secondary)]">Avg Student:Teacher</div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[var(--text-secondary)]">
          {filteredDistricts.length === districts.length
            ? `Showing all ${districts.length} districts`
            : `Found ${filteredDistricts.length} of ${districts.length} districts`}
        </p>
      </div>

      {/* District Grid */}
      {filteredDistricts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-secondary)]">
            No districts match your search. Try a different term.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedDistricts.slice(0, 50).map((district) => (
            <DistrictCard
              key={district.leaid}
              district={district}
              onClick={() => onSelectDistrict(district)}
              stateAvgRatio={avgRatio}
            />
          ))}
        </div>
      )}

      {sortedDistricts.length > 50 && (
        <p className="text-center text-[var(--text-secondary)] mt-6">
          Showing top 50 districts by enrollment. Use search to find specific districts.
        </p>
      )}
    </div>
  );
}
