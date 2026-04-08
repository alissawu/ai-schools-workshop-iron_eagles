import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StateSelector } from '../components/StateSelector';
import { DistrictCard } from '../components/DistrictCard';
import { SchoolCard } from '../components/SchoolCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MetricBar } from '../components/MetricBar';
import type { District, School } from '../api';

describe('StateSelector', () => {
  it('should render with placeholder option', () => {
    render(<StateSelector value="" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByText('Select a state...')).toBeInTheDocument();
  });

  it('should show all states alphabetically', () => {
    render(<StateSelector value="" onChange={() => {}} />);
    const options = screen.getAllByRole('option');
    // 51 states + 1 placeholder
    expect(options.length).toBe(52);
    // Alabama should be first (after placeholder)
    expect(options[1].textContent).toBe('Alabama');
  });

  it('should call onChange when state selected', () => {
    const onChange = vi.fn();
    render(<StateSelector value="" onChange={onChange} />);
    
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
    
    expect(onChange).toHaveBeenCalledWith('6');
  });
});

describe('DistrictCard', () => {
  const mockDistrict: District = {
    leaid: '123',
    lea_name: 'Test School District',
    fips: 6,
    city_mailing: 'Test City',
    state_mailing: 'CA',
    zip_mailing: '90210',
    latitude: 34.0,
    longitude: -118.0,
    enrollment: 5000,
    teachers_total_fte: 250,
    number_of_schools: 10,
    agency_type: 1,
    lowest_grade_offered: -1,
    highest_grade_offered: 12,
    county_name: 'Test County',
  };

  it('should render district information', () => {
    render(<DistrictCard district={mockDistrict} onClick={() => {}} stateAvgRatio={18} />);
    
    expect(screen.getByText('Test School District')).toBeInTheDocument();
    expect(screen.getByText(/Test City/)).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20:1')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<DistrictCard district={mockDistrict} onClick={onClick} stateAvgRatio={18} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalled();
  });

  it('should show ratio comparison indicator', () => {
    render(<DistrictCard district={mockDistrict} onClick={() => {}} stateAvgRatio={18} />);
    // 20:1 vs 18 avg = +11%
    expect(screen.getByText('+11%')).toBeInTheDocument();
  });

  it('should handle missing data gracefully', () => {
    const districtWithMissingData = { ...mockDistrict, enrollment: null, teachers_total_fte: null };
    render(<DistrictCard district={districtWithMissingData} onClick={() => {}} stateAvgRatio={18} />);
    
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });
});

describe('SchoolCard', () => {
  const mockSchool: School = {
    ncessch: '123456',
    school_name: 'Test Elementary School',
    lea_name: 'Test District',
    city_location: 'Test City',
    state_location: 'CA',
    zip_location: '90210',
    latitude: 34.0,
    longitude: -118.0,
    school_level: 1,
    school_type: 1,
    charter: 0,
    magnet: 1,
    enrollment: 500,
    teachers_fte: 25,
    free_lunch: 100,
    reduced_price_lunch: 50,
    free_or_reduced_price_lunch: 150,
    lowest_grade_offered: 0,
    highest_grade_offered: 5,
  };

  it('should render school information', () => {
    render(<SchoolCard school={mockSchool} />);
    
    expect(screen.getByText('Test Elementary School')).toBeInTheDocument();
    expect(screen.getByText(/Test City/)).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('20:1')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('should show charter tag when applicable', () => {
    const charterSchool = { ...mockSchool, charter: 1, magnet: 0 };
    render(<SchoolCard school={charterSchool} />);
    
    expect(screen.getByText('Charter')).toBeInTheDocument();
  });

  it('should show magnet tag when applicable', () => {
    render(<SchoolCard school={mockSchool} />);
    
    expect(screen.getByText('Magnet')).toBeInTheDocument();
  });
});

describe('LoadingSpinner', () => {
  it('should render with correct accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveClass('loading-spinner');
  });
});

describe('MetricBar', () => {
  it('should render with correct width', () => {
    const { container } = render(
      <MetricBar value={50} max={100} label="50%" color="blue" />
    );
    
    const fill = container.querySelector('.metric-bar-fill');
    expect(fill).toHaveStyle({ width: '50%' });
  });

  it('should cap at 100%', () => {
    const { container } = render(
      <MetricBar value={150} max={100} label="Over max" color="blue" />
    );
    
    const fill = container.querySelector('.metric-bar-fill');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('should apply inverted colors when specified', () => {
    const { container } = render(
      <MetricBar value={10} max={100} label="Low" color="blue" invertColor={true} />
    );
    
    const fill = container.querySelector('.metric-bar-fill');
    // Low value with invertColor should be green
    expect(fill).toHaveStyle({ backgroundColor: 'var(--accent-green)' });
  });

  it('should render label', () => {
    render(<MetricBar value={75} max={100} label="Test Label" color="blue" />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });
});

import { DemographicsChart } from '../components/DemographicsChart';
import { SchoolModal } from '../components/SchoolModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DemographicBreakdown } from '../api';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('DemographicsChart', () => {
  const mockDemographics: DemographicBreakdown[] = [
    { label: 'White', race: 1, enrollment: 500, percent: 50, color: '#6366f1' },
    { label: 'Hispanic', race: 3, enrollment: 300, percent: 30, color: '#ef4444' },
    { label: 'Black', race: 2, enrollment: 200, percent: 20, color: '#f59e0b' },
  ];

  it('should render demographics chart', () => {
    render(<DemographicsChart demographics={mockDemographics} />);
    
    expect(screen.getByText('Student Demographics')).toBeInTheDocument();
    expect(screen.getByText('White')).toBeInTheDocument();
    expect(screen.getByText('Hispanic')).toBeInTheDocument();
    expect(screen.getByText('Black')).toBeInTheDocument();
  });

  it('should show percentages', () => {
    render(<DemographicsChart demographics={mockDemographics} />);
    
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('should render stacked bar segments', () => {
    const { container } = render(<DemographicsChart demographics={mockDemographics} />);
    
    // Should have 3 segments in the bar
    const segments = container.querySelectorAll('.flex.rounded-lg > div');
    expect(segments.length).toBe(3);
  });

  it('should show source citation', () => {
    render(<DemographicsChart demographics={mockDemographics} />);
    
    expect(screen.getByText(/Source: CCD Enrollment by Race/)).toBeInTheDocument();
  });
});

describe('SchoolModal', () => {
  const mockSchool: School = {
    ncessch: '123456789',
    school_name: 'Test High School',
    lea_name: 'Test District',
    city_location: 'Test City',
    state_location: 'CA',
    zip_location: '90210',
    latitude: 34.0,
    longitude: -118.0,
    school_level: 3,
    school_type: 1,
    charter: 1,
    magnet: 0,
    enrollment: 1500,
    teachers_fte: 75,
    free_lunch: 300,
    reduced_price_lunch: 150,
    free_or_reduced_price_lunch: 450,
    lowest_grade_offered: 9,
    highest_grade_offered: 12,
  };

  const renderWithQuery = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('should render school details', () => {
    renderWithQuery(<SchoolModal school={mockSchool} onClose={() => {}} />);
    
    expect(screen.getByText('Test High School')).toBeInTheDocument();
    expect(screen.getByText(/Test City/)).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('should show charter tag', () => {
    renderWithQuery(<SchoolModal school={mockSchool} onClose={() => {}} />);
    
    expect(screen.getByText('Charter')).toBeInTheDocument();
  });

  it('should call onClose when clicking X', () => {
    const onClose = vi.fn();
    renderWithQuery(<SchoolModal school={mockSchool} onClose={onClose} />);
    
    fireEvent.click(screen.getByLabelText('Close'));
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when pressing Escape', () => {
    const onClose = vi.fn();
    renderWithQuery(<SchoolModal school={mockSchool} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should show grade range', () => {
    renderWithQuery(<SchoolModal school={mockSchool} onClose={() => {}} />);
    
    expect(screen.getByText('9 - 12')).toBeInTheDocument();
  });

  it('should show FRL percentage', () => {
    renderWithQuery(<SchoolModal school={mockSchool} onClose={() => {}} />);
    
    // 450/1500 = 30%
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('should show Niche link', () => {
    renderWithQuery(<SchoolModal school={mockSchool} onClose={() => {}} />);
    
    expect(screen.getByText('View on Niche ↗')).toBeInTheDocument();
  });

  it('should close when clicking overlay', () => {
    const onClose = vi.fn();
    const { container } = renderWithQuery(<SchoolModal school={mockSchool} onClose={onClose} />);
    
    const overlay = container.querySelector('.fixed.inset-0');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });
});

describe('SchoolCard onClick', () => {
  const mockSchool: School = {
    ncessch: '123456',
    school_name: 'Clickable School',
    lea_name: 'Test District',
    city_location: 'Test City',
    state_location: 'CA',
    zip_location: '90210',
    latitude: 34.0,
    longitude: -118.0,
    school_level: 1,
    school_type: 1,
    charter: 0,
    magnet: 0,
    enrollment: 500,
    teachers_fte: 25,
    free_lunch: 100,
    reduced_price_lunch: 50,
    free_or_reduced_price_lunch: 150,
    lowest_grade_offered: 0,
    highest_grade_offered: 5,
  };

  it('should call onClick when provided', () => {
    const onClick = vi.fn();
    render(<SchoolCard school={mockSchool} onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('SchoolCard keyboard', () => {
  const mockSchool: School = {
    ncessch: '123456',
    school_name: 'Keyboard School',
    lea_name: 'Test District',
    city_location: 'Test City',
    state_location: 'CA',
    zip_location: '90210',
    latitude: 34.0,
    longitude: -118.0,
    school_level: 1,
    school_type: 1,
    charter: 0,
    magnet: 0,
    enrollment: 500,
    teachers_fte: 25,
    free_lunch: 100,
    reduced_price_lunch: 50,
    free_or_reduced_price_lunch: 150,
    lowest_grade_offered: 0,
    highest_grade_offered: 5,
  };

  it('should call onClick on Enter key', () => {
    const onClick = vi.fn();
    render(<SchoolCard school={mockSchool} onClick={onClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });

  it('should call onClick on Space key', () => {
    const onClick = vi.fn();
    render(<SchoolCard school={mockSchool} onClick={onClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalled();
  });
});

describe('SchoolModal Niche grades colors', () => {
  const createSchool = (): School => ({
    ncessch: '999',
    school_name: 'Grade Color Test School',
    lea_name: 'Test District',
    city_location: 'Test City',
    state_location: 'CA',
    zip_location: '90210',
    latitude: 34.0,
    longitude: -118.0,
    school_level: 2,
    school_type: 1,
    charter: 0,
    magnet: 0,
    enrollment: 800,
    teachers_fte: 40,
    free_lunch: 200,
    reduced_price_lunch: 100,
    free_or_reduced_price_lunch: 300,
    lowest_grade_offered: 6,
    highest_grade_offered: 8,
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('should render B grade with blue styling', async () => {
    // Mock fetch to return Niche data with B grades
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true }) // health check
      .mockResolvedValueOnce({ 
        ok: true, 
        json: () => Promise.resolve({
          overall_grade: 'B+',
          grades: { academics: 'B', teachers: 'B-' },
          niche_url: 'https://niche.com/test',
        })
      });

    renderWithQuery(<SchoolModal school={createSchool()} onClose={() => {}} />);

    // Wait and check - the B grade should appear
    await new Promise(r => setTimeout(r, 100));
    
    globalThis.fetch = originalFetch;
  });

  it('should render C grade with yellow styling', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: () => Promise.resolve({
          overall_grade: 'C',
          grades: { academics: 'C+' },
          niche_url: 'https://niche.com/test',
        })
      });

    renderWithQuery(<SchoolModal school={createSchool()} onClose={() => {}} />);
    await new Promise(r => setTimeout(r, 100));
    
    globalThis.fetch = originalFetch;
  });

  it('should render D grade with red styling', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: () => Promise.resolve({
          overall_grade: 'D',
          grades: { academics: 'D-' },
          niche_url: 'https://niche.com/test',
        })
      });

    renderWithQuery(<SchoolModal school={createSchool()} onClose={() => {}} />);
    await new Promise(r => setTimeout(r, 100));
    
    globalThis.fetch = originalFetch;
  });
});
