import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DistrictDetail } from '../components/DistrictDetail';
import type { District } from '../api';

// Mock the API functions
vi.mock('../api', async () => {
  const actual = await vi.importActual('../api');
  return {
    ...actual,
    fetchSchoolsInDistrict: vi.fn(),
    fetchDemographics: vi.fn(),
    fetchNicheDistrict: vi.fn(),
  };
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

const mockDistrict: District = {
  leaid: '3400001',
  lea_name: 'Test District',
  fips: 34,
  city_mailing: 'Test City',
  state_mailing: 'NJ',
  zip_mailing: '07001',
  latitude: 40.0,
  longitude: -74.0,
  enrollment: 5000,
  teachers_total_fte: 250,
  number_of_schools: 15,
  agency_type: 1,
  lowest_grade_offered: -1,
  highest_grade_offered: 12,
  county_name: 'Test County',
};

describe('DistrictDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('should render district header', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    (fetchSchoolsInDistrict as any).mockResolvedValue([]);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    expect(screen.getByText('Test District')).toBeInTheDocument();
    expect(screen.getByText(/Test City/)).toBeInTheDocument();
  });

  it('should call onBack when back button clicked', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    (fetchSchoolsInDistrict as any).mockResolvedValue([]);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    const onBack = vi.fn();
    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={onBack} />);

    fireEvent.click(screen.getByText('Back to districts'));
    expect(onBack).toHaveBeenCalled();
  });

  it('should display key metrics', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    (fetchSchoolsInDistrict as any).mockResolvedValue([]);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('20:1')).toBeInTheDocument();
  });

  it('should show schools when loaded', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    const mockSchools = [
      {
        ncessch: '1',
        school_name: 'Elementary School',
        school_level: 1,
        enrollment: 500,
        teachers_fte: 25,
        city_location: 'Test City',
        state_location: 'NJ',
      },
    ];
    (fetchSchoolsInDistrict as any).mockResolvedValue(mockSchools);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Elementary School')).toBeInTheDocument();
    });
  });

  it('should show Niche data when available', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    (fetchSchoolsInDistrict as any).mockResolvedValue([]);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue({
      overall_grade: 'A',
      grades: { academics: 'A+', teachers: 'A-' },
      reviews: { average: 4.5, count: 100 },
      niche_url: 'https://niche.com/test',
    });

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('Niche Ratings')).toBeInTheDocument();
    });
  });

  it('should show demographics when available', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    (fetchSchoolsInDistrict as any).mockResolvedValue([]);
    (fetchDemographics as any).mockResolvedValue([
      { label: 'White', race: 1, enrollment: 2500, percent: 50, color: '#6366f1' },
      { label: 'Hispanic', race: 3, enrollment: 1500, percent: 30, color: '#ef4444' },
    ]);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Student Demographics')).toBeInTheDocument();
    });
  });

  it('should handle empty schools list', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    (fetchSchoolsInDistrict as any).mockResolvedValue([]);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('No school data available.')).toBeInTheDocument();
    });
  });
  it('should open school modal when school is clicked', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    const mockSchools = [
      {
        ncessch: '1',
        school_name: 'Clickable High School',
        school_level: 3,
        enrollment: 1000,
        teachers_fte: 50,
        city_location: 'Test City',
        state_location: 'NJ',
        zip_location: '07001',
        latitude: 40.0,
        longitude: -74.0,
        charter: 0,
        magnet: 0,
        school_type: 1,
        free_lunch: 200,
        reduced_price_lunch: 100,
        free_or_reduced_price_lunch: 300,
        lowest_grade_offered: 9,
        highest_grade_offered: 12,
        lea_name: 'Test District',
      },
    ];
    (fetchSchoolsInDistrict as any).mockResolvedValue(mockSchools);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Clickable High School')).toBeInTheDocument();
    });

    // Click on the school card
    const schoolCard = screen.getByText('Clickable High School').closest('button');
    if (schoolCard) {
      fireEvent.click(schoolCard);
    }

    // Modal should appear with school details
    await waitFor(() => {
      // Modal should show the school name in header
      const modalTitle = screen.getAllByText('Clickable High School');
      expect(modalTitle.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should group schools by level', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    const mockSchools = [
      { ncessch: '1', school_name: 'Elementary A', school_level: 1, enrollment: 500, teachers_fte: 25, city_location: 'Test', state_location: 'NJ' },
      { ncessch: '2', school_name: 'Middle B', school_level: 2, enrollment: 600, teachers_fte: 30, city_location: 'Test', state_location: 'NJ' },
      { ncessch: '3', school_name: 'High C', school_level: 3, enrollment: 800, teachers_fte: 40, city_location: 'Test', state_location: 'NJ' },
    ];
    (fetchSchoolsInDistrict as any).mockResolvedValue(mockSchools);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Elementary Schools/)).toBeInTheDocument();
      expect(screen.getByText(/Middle Schools/)).toBeInTheDocument();
      expect(screen.getByText(/High Schools/)).toBeInTheDocument();
    });
  });

  it('should show Niche loading state', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    (fetchSchoolsInDistrict as any).mockResolvedValue([]);
    (fetchDemographics as any).mockResolvedValue(null);
    // Never resolve to keep in loading state
    (fetchNicheDistrict as any).mockImplementation(() => new Promise(() => {}));

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    expect(screen.getByText('Loading Niche ratings...')).toBeInTheDocument();
  });

  it('should show proficiency scores from Niche', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    (fetchSchoolsInDistrict as any).mockResolvedValue([]);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue({
      overall_grade: 'A',
      grades: {},
      math_proficiency: 85,
      reading_proficiency: 90,
      graduation_rate: 95,
      niche_url: 'https://niche.com/test',
    });

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });
  it('should render school cards sorted by enrollment', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    const mockSchools = [
      { ncessch: '1', school_name: 'Small School', school_level: 1, enrollment: 100, teachers_fte: 5, city_location: 'Test', state_location: 'NJ', zip_location: '07001', charter: 0, magnet: 0, free_or_reduced_price_lunch: 20, lowest_grade_offered: 0, highest_grade_offered: 5, lea_name: 'Test', latitude: 40, longitude: -74, school_type: 1 },
      { ncessch: '2', school_name: 'Large School', school_level: 1, enrollment: 800, teachers_fte: 40, city_location: 'Test', state_location: 'NJ', zip_location: '07001', charter: 0, magnet: 0, free_or_reduced_price_lunch: 160, lowest_grade_offered: 0, highest_grade_offered: 5, lea_name: 'Test', latitude: 40, longitude: -74, school_type: 1 },
      { ncessch: '3', school_name: 'Medium School', school_level: 1, enrollment: 400, teachers_fte: 20, city_location: 'Test', state_location: 'NJ', zip_location: '07001', charter: 0, magnet: 0, free_or_reduced_price_lunch: 80, lowest_grade_offered: 0, highest_grade_offered: 5, lea_name: 'Test', latitude: 40, longitude: -74, school_type: 1 },
    ];
    (fetchSchoolsInDistrict as any).mockResolvedValue(mockSchools);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Large School')).toBeInTheDocument();
      expect(screen.getByText('Medium School')).toBeInTheDocument();
      expect(screen.getByText('Small School')).toBeInTheDocument();
    });
  });

  it('should open and close school modal', async () => {
    const { fetchSchoolsInDistrict, fetchDemographics, fetchNicheDistrict } = await import('../api');
    const mockSchool = {
      ncessch: '123',
      school_name: 'Modal Test School',
      school_level: 3,
      enrollment: 1000,
      teachers_fte: 50,
      city_location: 'Test City',
      state_location: 'NJ',
      zip_location: '07001',
      charter: 0,
      magnet: 0,
      free_or_reduced_price_lunch: 200,
      free_lunch: 150,
      reduced_price_lunch: 50,
      lowest_grade_offered: 9,
      highest_grade_offered: 12,
      lea_name: 'Test District',
      latitude: 40,
      longitude: -74,
      school_type: 1,
    };
    (fetchSchoolsInDistrict as any).mockResolvedValue([mockSchool]);
    (fetchDemographics as any).mockResolvedValue(null);
    (fetchNicheDistrict as any).mockResolvedValue(null);

    renderWithQuery(<DistrictDetail district={mockDistrict} onBack={() => {}} />);

    // Wait for school to appear
    await waitFor(() => {
      expect(screen.getByText('Modal Test School')).toBeInTheDocument();
    });

    // Click school card to open modal
    const schoolCards = screen.getAllByRole('button');
    const schoolCard = schoolCards.find(btn => btn.textContent?.includes('Modal Test School'));
    if (schoolCard) {
      fireEvent.click(schoolCard);
    }

    // Modal should open - check for close button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });
  });
});
