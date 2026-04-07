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
