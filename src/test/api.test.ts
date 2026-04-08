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
  resetSchoolsCache,
  STATES,
} from '../api';

describe('API Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetSchoolsCache();
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
    it('should fetch and filter schools from bundled data', async () => {
      // Bundled data is keyed by leaid
      const mockData = {
        '1234567': [
          { ncessch: '1', school_name: 'School A', city: 'Test', state: 'FL', enrollment: 500 },
          { ncessch: '2', school_name: 'School B', city: 'Test', state: 'FL', enrollment: 0 },
          { ncessch: '3', school_name: 'School C', city: 'Test', state: 'FL', enrollment: 300 },
        ],
      };
      
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchSchoolsInDistrict('1234567');
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('data/schools/12.json')
      );
      // Should filter out schools with 0 enrollment
      expect(result).toHaveLength(2);
      expect(result[0].school_name).toBe('School A');
    });

    it('should return empty array for unknown district', async () => {
      const mockData = {
        '9999999': [{ ncessch: '1', school_name: 'Other School', enrollment: 100 }],
      };
      
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchSchoolsInDistrict('1234567');
      expect(result).toHaveLength(0);
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

  describe('Niche API', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    describe('fetchNicheDistrict', () => {
      it('should return null when server is not available', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
        
        const { fetchNicheDistrict } = await import('../api');
        const result = await fetchNicheDistrict('Test District', 'CA', '123');
        
        expect(result).toBeNull();
      });
    });

    describe('fetchNicheSchool', () => {
      it('should return null when server is not available', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
        
        const { fetchNicheSchool } = await import('../api');
        const result = await fetchNicheSchool('Test School', 'Test City', 'CA', '123456');
        
        expect(result).toBeNull();
      });
    });
  });

  describe('Niche API success cases', () => {
    it('fetchNicheDistrict should return data when server responds', async () => {
      const mockData = {
        overall_grade: 'A',
        grades: { academics: 'A+' },
        niche_url: 'https://niche.com/test',
      };

      // Mock health check success
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData) });
      
      // Need to reimport to reset the cached nicheServerAvailable
      vi.resetModules();
      const { fetchNicheDistrict } = await import('../api');
      const result = await fetchNicheDistrict('Test District', 'CA', '123');
      
      expect(result).toEqual(mockData);
    });

    it('fetchNicheSchool should return data when server responds', async () => {
      const mockData = {
        overall_grade: 'B+',
        grades: { teachers: 'A' },
        niche_url: 'https://niche.com/school',
      };

      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData) });
      
      vi.resetModules();
      const { fetchNicheSchool } = await import('../api');
      const result = await fetchNicheSchool('Test School', 'Test City', 'CA', '123456');
      
      expect(result).toEqual(mockData);
    });

    it('fetchNicheDistrict should return null on 404', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })
        .mockResolvedValueOnce({ ok: false, status: 404 });
      
      vi.resetModules();
      const { fetchNicheDistrict } = await import('../api');
      const result = await fetchNicheDistrict('Unknown District', 'XX');
      
      expect(result).toBeNull();
    });
  });

  describe('fetchDemographics', () => {
    it('should fetch and process demographics data', async () => {
      const mockData = {
        results: [
          { race: 1, sex: 99, enrollment: 500, leaid: '123', year: 2022, fips: 6, grade: 99 },
          { race: 3, sex: 99, enrollment: 300, leaid: '123', year: 2022, fips: 6, grade: 99 },
          { race: 99, sex: 99, enrollment: 800, leaid: '123', year: 2022, fips: 6, grade: 99 }, // Total, should be excluded
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const { fetchDemographics } = await import('../api');
      const result = await fetchDemographics('123');

      expect(result).not.toBeNull();
      expect(result!.length).toBe(2);
      expect(result![0].label).toBe('White');
      expect(result![0].percent).toBeCloseTo(62.5, 1);
    });

    it('should return null when no data', async () => {
      const mockData = { results: [] };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const { fetchDemographics } = await import('../api');
      const result = await fetchDemographics('123');

      expect(result).toBeNull();
    });

    it('should handle unknown race codes', async () => {
      const mockData = {
        results: [
          { race: 999, sex: 99, enrollment: 100, leaid: '123', year: 2022, fips: 6, grade: 99 },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const { fetchDemographics } = await import('../api');
      const result = await fetchDemographics('123');

      expect(result).not.toBeNull();
      expect(result![0].label).toBe('Race 999');
    });
  });

  describe('Niche API error handling', () => {
    it('fetchNicheDistrict should catch fetch errors', async () => {
      // Mock health check to pass, then fetch to throw
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockImplementationOnce(() => { throw new Error('Network failed'); });
      
      vi.resetModules();
      const { fetchNicheDistrict } = await import('../api');
      const result = await fetchNicheDistrict('Test', 'CA');
      
      expect(result).toBeNull();
    });

    it('fetchNicheSchool should catch fetch errors', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockImplementationOnce(() => { throw new Error('Network failed'); });
      
      vi.resetModules();
      const { fetchNicheSchool } = await import('../api');
      const result = await fetchNicheSchool('Test School', 'City', 'CA');
      
      expect(result).toBeNull();
    });
  });
