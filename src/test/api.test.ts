import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchDistricts,
  fetchSchoolsInDistrict,
  fetchDistrictFinance,
  getSchoolLevelLabel,
  getGradeLabel,
  calculateStudentTeacherRatio,
  calculateFRLPercent,
  getNicheDistrictUrl,
  getNicheSchoolUrl,
  STATES,
} from '../api';

describe('API Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('STATES', () => {
    it('should contain all 50 states plus DC', () => {
      expect(Object.keys(STATES)).toHaveLength(51);
    });

    it('should have correct FIPS codes', () => {
      expect(STATES.CA.fips).toBe(6);
      expect(STATES.NY.fips).toBe(36);
      expect(STATES.TX.fips).toBe(48);
      expect(STATES.NJ.fips).toBe(34);
    });

    it('should have names for all states', () => {
      Object.values(STATES).forEach((state) => {
        expect(state.name).toBeTruthy();
        expect(state.fips).toBeGreaterThan(0);
      });
    });
  });

  describe('fetchDistricts', () => {
    it('should fetch bundled district data by FIPS code', async () => {
      const mockData = [
        { leaid: '1', lea_name: 'Test District', agency_type: 1, enrollment: 1000 },
        { leaid: '2', lea_name: 'Another District', agency_type: 1, enrollment: 500 },
      ];
      
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchDistricts(6);
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('data/districts/6.json')
      );
      expect(result).toHaveLength(2);
      expect(result[0].leaid).toBe('1');
    });

    it('should throw on failed fetch', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await expect(fetchDistricts(6)).rejects.toThrow('Failed to load district data');
    });
  });

  describe('fetchSchoolsInDistrict', () => {
    it('should fetch and filter schools', async () => {
      const mockData = {
        results: [
          { ncessch: '1', school_name: 'School A', enrollment: 500 },
          { ncessch: '2', school_name: 'School B', enrollment: 0 },
          { ncessch: '3', school_name: 'School C', enrollment: 300 },
        ],
      };
      
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchSchoolsInDistrict('123');
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://educationdata.urban.org/api/v1/schools/ccd/directory/2022/?leaid=123'
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('fetchDistrictFinance', () => {
    it('should fetch finance data', async () => {
      const mockData = {
        results: [{ leaid: '123', exp_total: 1000000 }],
      };
      
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchDistrictFinance('123');
      
      expect(result).toEqual({ leaid: '123', exp_total: 1000000 });
    });

    it('should return null when no data', async () => {
      const mockData = { results: [] };
      
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchDistrictFinance('123');
      
      expect(result).toBeNull();
    });
  });

  describe('getSchoolLevelLabel', () => {
    it('should return correct labels', () => {
      expect(getSchoolLevelLabel(1)).toBe('Elementary');
      expect(getSchoolLevelLabel(2)).toBe('Middle');
      expect(getSchoolLevelLabel(3)).toBe('High');
      expect(getSchoolLevelLabel(4)).toBe('Other');
      expect(getSchoolLevelLabel(99)).toBe('N/A');
    });
  });

  describe('getGradeLabel', () => {
    it('should return correct grade labels', () => {
      expect(getGradeLabel(-1)).toBe('PK');
      expect(getGradeLabel(0)).toBe('K');
      expect(getGradeLabel(1)).toBe('1');
      expect(getGradeLabel(12)).toBe('12');
      expect(getGradeLabel(13)).toBe('Adult');
    });
  });

  describe('calculateStudentTeacherRatio', () => {
    it('should calculate ratio correctly', () => {
      expect(calculateStudentTeacherRatio(200, 10)).toBe(20);
      expect(calculateStudentTeacherRatio(150, 10)).toBe(15);
      expect(calculateStudentTeacherRatio(333, 22)).toBe(15.1);
    });

    it('should return null for invalid inputs', () => {
      expect(calculateStudentTeacherRatio(null, 10)).toBeNull();
      expect(calculateStudentTeacherRatio(200, null)).toBeNull();
      expect(calculateStudentTeacherRatio(200, 0)).toBeNull();
    });
  });

  describe('calculateFRLPercent', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateFRLPercent(50, 100)).toBe(50);
      expect(calculateFRLPercent(25, 200)).toBe(13);
      expect(calculateFRLPercent(100, 100)).toBe(100);
    });

    it('should return null for invalid inputs', () => {
      expect(calculateFRLPercent(null, 100)).toBeNull();
      expect(calculateFRLPercent(50, null)).toBeNull();
      expect(calculateFRLPercent(50, 0)).toBeNull();
    });
  });

  describe('getNicheDistrictUrl', () => {
    it('should generate correct Niche district URLs', () => {
      const url = getNicheDistrictUrl('Bridgewater-Raritan Regional School District', 'NJ');
      expect(url).toBe('https://www.niche.com/k12/d/bridgewater-raritan-regional-school-district-nj/');
    });

    it('should handle special characters', () => {
      const url = getNicheDistrictUrl("St. Mary's County Public Schools", 'MD');
      expect(url).toBe('https://www.niche.com/k12/d/st-marys-county-public-schools-md/');
    });
  });

  describe('getNicheSchoolUrl', () => {
    it('should generate correct Niche school URLs', () => {
      const url = getNicheSchoolUrl('Lincoln Elementary School', 'Springfield', 'IL');
      expect(url).toBe('https://www.niche.com/k12/lincoln-elementary-school-springfield-il/');
    });
  });
});
