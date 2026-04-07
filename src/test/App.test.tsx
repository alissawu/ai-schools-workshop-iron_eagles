import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../api';

// Mock the api module
vi.mock('../api', async () => {
  const actual = await vi.importActual('../api');
  return {
    ...actual,
    fetchDistricts: vi.fn(),
    fetchSchoolsInDistrict: vi.fn(),
    fetchDistrictFinance: vi.fn(),
  };
});

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should render the header', () => {
    render(<App />);
    
    expect(screen.getByText('School District Explorer')).toBeInTheDocument();
    expect(screen.getByText(/Evaluate K-12 school districts/)).toBeInTheDocument();
  });

  it('should render the state selector', () => {
    render(<App />);
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Select a state...')).toBeInTheDocument();
  });

  it('should show intro message when no state selected', () => {
    render(<App />);
    
    expect(screen.getByText('Select a State to Begin')).toBeInTheDocument();
  });

  it('should show search input when state is selected', async () => {
    vi.mocked(api.fetchDistricts).mockResolvedValue([]);

    render(<App />);
    
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search districts/)).toBeInTheDocument();
    });
  });

  it('should render the footer', () => {
    render(<App />);
    
    expect(screen.getByText(/Urban Institute Education Data Portal/)).toBeInTheDocument();
  });

  it('should show loading state when fetching districts', async () => {
    vi.mocked(api.fetchDistricts).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
    
    await waitFor(() => {
      expect(screen.getByText('Loading districts...')).toBeInTheDocument();
    });
  });

  it('should display districts when loaded', async () => {
    const mockDistricts = [
      {
        leaid: '1',
        lea_name: 'Test District',
        city_mailing: 'Test City',
        state_mailing: 'CA',
        enrollment: 1000,
        teachers_total_fte: 50,
        number_of_schools: 5,
        agency_type: 1,
        lowest_grade_offered: -1,
        highest_grade_offered: 12,
        county_name: 'Test County',
        fips: 6,
        zip_mailing: '90210',
        latitude: 34.0,
        longitude: -118.0,
      },
    ];

    vi.mocked(api.fetchDistricts).mockResolvedValue(mockDistricts as api.District[]);

    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test District')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should filter districts by search query', async () => {
    const mockDistricts = [
      {
        leaid: '1',
        lea_name: 'Apple District',
        city_mailing: 'Fruitville',
        state_mailing: 'CA',
        enrollment: 1000,
        teachers_total_fte: 50,
        number_of_schools: 5,
        agency_type: 1,
        lowest_grade_offered: -1,
        highest_grade_offered: 12,
        county_name: 'Fruit County',
        fips: 6,
        zip_mailing: '90210',
        latitude: 34.0,
        longitude: -118.0,
      },
      {
        leaid: '2',
        lea_name: 'Banana District',
        city_mailing: 'Vegtown',
        state_mailing: 'CA',
        enrollment: 2000,
        teachers_total_fte: 100,
        number_of_schools: 10,
        agency_type: 1,
        lowest_grade_offered: -1,
        highest_grade_offered: 12,
        county_name: 'Veg County',
        fips: 6,
        zip_mailing: '90211',
        latitude: 34.1,
        longitude: -118.1,
      },
    ];

    vi.mocked(api.fetchDistricts).mockResolvedValue(mockDistricts as api.District[]);

    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
    
    await waitFor(() => {
      expect(screen.getByText('Apple District')).toBeInTheDocument();
      expect(screen.getByText('Banana District')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Search for Apple
    fireEvent.change(screen.getByPlaceholderText(/Search districts/), {
      target: { value: 'apple' },
    });

    await waitFor(() => {
      expect(screen.getByText('Apple District')).toBeInTheDocument();
      expect(screen.queryByText('Banana District')).not.toBeInTheDocument();
    });
  });

  it('should show district detail when district is clicked', async () => {
    const mockDistricts = [
      {
        leaid: '1',
        lea_name: 'Test District',
        city_mailing: 'Test City',
        state_mailing: 'CA',
        enrollment: 1000,
        teachers_total_fte: 50,
        number_of_schools: 5,
        agency_type: 1,
        lowest_grade_offered: -1,
        highest_grade_offered: 12,
        county_name: 'Test County',
        fips: 6,
        zip_mailing: '90210',
        latitude: 34.0,
        longitude: -118.0,
      },
    ];

    const mockSchools = [
      {
        ncessch: '1',
        school_name: 'Test School',
        enrollment: 500,
        school_level: 1,
        charter: 0,
        magnet: 0,
        teachers_fte: 25,
        free_or_reduced_price_lunch: 100,
        lowest_grade_offered: 0,
        highest_grade_offered: 5,
        city_location: 'Test City',
        lea_name: 'Test District',
        state_location: 'CA',
        zip_location: '90210',
        latitude: 34.0,
        longitude: -118.0,
        school_type: 1,
        free_lunch: 50,
        reduced_price_lunch: 50,
      },
    ];

    vi.mocked(api.fetchDistricts).mockResolvedValue(mockDistricts as api.District[]);
    vi.mocked(api.fetchSchoolsInDistrict).mockResolvedValue(mockSchools as api.School[]);

    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test District')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Test District'));

    await waitFor(() => {
      expect(screen.getByText('Back to districts')).toBeInTheDocument();
      expect(screen.getByText('Schools in this District')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should go back to district list when back button clicked', async () => {
    const mockDistricts = [
      {
        leaid: '1',
        lea_name: 'Test District',
        city_mailing: 'Test City',
        state_mailing: 'CA',
        enrollment: 1000,
        teachers_total_fte: 50,
        number_of_schools: 5,
        agency_type: 1,
        lowest_grade_offered: -1,
        highest_grade_offered: 12,
        county_name: 'Test County',
        fips: 6,
        zip_mailing: '90210',
        latitude: 34.0,
        longitude: -118.0,
      },
    ];

    vi.mocked(api.fetchDistricts).mockResolvedValue(mockDistricts as api.District[]);
    vi.mocked(api.fetchSchoolsInDistrict).mockResolvedValue([]);

    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test District')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Test District'));

    await waitFor(() => {
      expect(screen.getByText('Back to districts')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Back to districts'));

    await waitFor(() => {
      expect(screen.queryByText('Back to districts')).not.toBeInTheDocument();
    });
  });
});
