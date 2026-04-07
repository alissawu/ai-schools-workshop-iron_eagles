import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { StateSelector } from './components/StateSelector';
import { DistrictList } from './components/DistrictList';
import { DistrictDetail } from './components/DistrictDetail';
import type { District } from './api';
import { fetchDistricts } from './api';

const TOP_STATE_FIPS = [6, 48, 36, 12, 34]; // CA, TX, NY, FL, NJ

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 2,
      },
    },
  });
}

const defaultQueryClient = createQueryClient();

function AppContent() {
  const queryClient = useQueryClient();
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Prefetch top 5 states on mount
  useEffect(() => {
    TOP_STATE_FIPS.forEach((fips) => {
      queryClient.prefetchQuery({
        queryKey: ['districts', String(fips)],
        queryFn: () => fetchDistricts(fips),
      });
    });
  }, [queryClient]);

  const handleBack = () => {
    setSelectedDistrict(null);
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedDistrict(null);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-4xl italic tracking-tight">
                School District Explorer
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                Evaluate K-12 school districts across the United States
              </p>
            </div>
            <div className="text-right text-sm text-[var(--text-secondary)]">
              <div>Data from Urban Institute</div>
              <div>Education Data Portal</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {selectedDistrict ? (
          <DistrictDetail district={selectedDistrict} onBack={handleBack} />
        ) : (
          <>
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="sm:w-64">
                <StateSelector
                  value={selectedState}
                  onChange={handleStateChange}
                />
              </div>
              {selectedState && (
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search districts by name or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            {!selectedState ? (
              <div className="text-center py-20">
                <div className="font-serif text-6xl italic mb-4">📚</div>
                <h2 className="text-2xl font-semibold mb-2">
                  Select a State to Begin
                </h2>
                <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                  Choose a state from the dropdown above to explore school districts,
                  compare metrics, and find the right fit for your family or career.
                </p>
              </div>
            ) : (
              <DistrictList
                stateFips={selectedState}
                searchQuery={searchQuery}
                onSelectDistrict={setSelectedDistrict}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-[var(--text-secondary)]">
          <p>
            Data sourced from the{' '}
            <a
              href="https://educationdata.urban.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-blue)] hover:underline"
            >
              Urban Institute Education Data Portal
            </a>
            . School year 2021-2022.
          </p>
        </div>
      </footer>
    </div>
  );
}

interface AppProps {
  queryClient?: QueryClient;
}

function App({ queryClient }: AppProps) {
  return (
    <QueryClientProvider client={queryClient || defaultQueryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export { createQueryClient };
export default App;
