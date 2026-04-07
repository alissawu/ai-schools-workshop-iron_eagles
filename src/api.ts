const BASE_URL = 'https://educationdata.urban.org/api/v1';
const YEAR = 2022; // Most recent complete year

export interface School {
  ncessch: string;
  school_name: string;
  lea_name: string;
  city_location: string;
  state_location: string;
  zip_location: string;
  latitude: number;
  longitude: number;
  school_level: number;
  school_type: number;
  charter: number;
  magnet: number | null;
  enrollment: number | null;
  teachers_fte: number | null;
  free_lunch: number | null;
  reduced_price_lunch: number | null;
  free_or_reduced_price_lunch: number | null;
  lowest_grade_offered: number;
  highest_grade_offered: number;
}

export interface District {
  leaid: string;
  lea_name: string;
  fips: number;
  city_mailing: string;
  state_mailing: string;
  zip_mailing: string;
  latitude: number;
  longitude: number;
  enrollment: number | null;
  teachers_total_fte: number | null;
  number_of_schools: number;
  agency_type: number;
  lowest_grade_offered: number;
  highest_grade_offered: number;
  county_name: string;
}

export interface DistrictFinance {
  leaid: string;
  rev_total: number | null;
  exp_total: number | null;
  exp_current_instruction_total: number | null;
  exp_current_supp_serve_total: number | null;
  tfed_rev: number | null;
  tstate_rev: number | null;
  tlocal_rev: number | null;
}

// FIPS state codes
export const STATES: Record<string, { name: string; fips: number }> = {
  AL: { name: 'Alabama', fips: 1 },
  AK: { name: 'Alaska', fips: 2 },
  AZ: { name: 'Arizona', fips: 4 },
  AR: { name: 'Arkansas', fips: 5 },
  CA: { name: 'California', fips: 6 },
  CO: { name: 'Colorado', fips: 8 },
  CT: { name: 'Connecticut', fips: 9 },
  DE: { name: 'Delaware', fips: 10 },
  DC: { name: 'District of Columbia', fips: 11 },
  FL: { name: 'Florida', fips: 12 },
  GA: { name: 'Georgia', fips: 13 },
  HI: { name: 'Hawaii', fips: 15 },
  ID: { name: 'Idaho', fips: 16 },
  IL: { name: 'Illinois', fips: 17 },
  IN: { name: 'Indiana', fips: 18 },
  IA: { name: 'Iowa', fips: 19 },
  KS: { name: 'Kansas', fips: 20 },
  KY: { name: 'Kentucky', fips: 21 },
  LA: { name: 'Louisiana', fips: 22 },
  ME: { name: 'Maine', fips: 23 },
  MD: { name: 'Maryland', fips: 24 },
  MA: { name: 'Massachusetts', fips: 25 },
  MI: { name: 'Michigan', fips: 26 },
  MN: { name: 'Minnesota', fips: 27 },
  MS: { name: 'Mississippi', fips: 28 },
  MO: { name: 'Missouri', fips: 29 },
  MT: { name: 'Montana', fips: 30 },
  NE: { name: 'Nebraska', fips: 31 },
  NV: { name: 'Nevada', fips: 32 },
  NH: { name: 'New Hampshire', fips: 33 },
  NJ: { name: 'New Jersey', fips: 34 },
  NM: { name: 'New Mexico', fips: 35 },
  NY: { name: 'New York', fips: 36 },
  NC: { name: 'North Carolina', fips: 37 },
  ND: { name: 'North Dakota', fips: 38 },
  OH: { name: 'Ohio', fips: 39 },
  OK: { name: 'Oklahoma', fips: 40 },
  OR: { name: 'Oregon', fips: 41 },
  PA: { name: 'Pennsylvania', fips: 42 },
  RI: { name: 'Rhode Island', fips: 44 },
  SC: { name: 'South Carolina', fips: 45 },
  SD: { name: 'South Dakota', fips: 46 },
  TN: { name: 'Tennessee', fips: 47 },
  TX: { name: 'Texas', fips: 48 },
  UT: { name: 'Utah', fips: 49 },
  VT: { name: 'Vermont', fips: 50 },
  VA: { name: 'Virginia', fips: 51 },
  WA: { name: 'Washington', fips: 53 },
  WV: { name: 'West Virginia', fips: 54 },
  WI: { name: 'Wisconsin', fips: 55 },
  WY: { name: 'Wyoming', fips: 56 },
};

export async function fetchDistricts(fips: number): Promise<District[]> {
  const url = `${BASE_URL}/school-districts/ccd/directory/${YEAR}/?fips=${fips}`;
  const res = await fetch(url);
  const data = await res.json();
  // Filter to only regular school districts (agency_type 1) with enrollment > 0
  return data.results.filter((d: District) => 
    d.agency_type === 1 && d.enrollment && d.enrollment > 0
  );
}

export async function fetchSchoolsInDistrict(leaid: string): Promise<School[]> {
  const url = `${BASE_URL}/schools/ccd/directory/${YEAR}/?leaid=${leaid}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results.filter((s: School) => s.enrollment && s.enrollment > 0);
}

export async function fetchDistrictFinance(leaid: string): Promise<DistrictFinance | null> {
  // Finance data may be one year behind
  const url = `${BASE_URL}/school-districts/ccd/finance/2020/?leaid=${leaid}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results[0] || null;
}

export function getSchoolLevelLabel(level: number): string {
  switch (level) {
    case 1: return 'Elementary';
    case 2: return 'Middle';
    case 3: return 'High';
    case 4: return 'Other';
    default: return 'N/A';
  }
}

export function getGradeLabel(grade: number): string {
  if (grade === -1) return 'PK';
  if (grade === 0) return 'K';
  if (grade === 13) return 'Adult';
  return `${grade}`;
}

export function calculateStudentTeacherRatio(enrollment: number | null, teachers: number | null): number | null {
  if (!enrollment || !teachers || teachers === 0) return null;
  return Math.round((enrollment / teachers) * 10) / 10;
}

export function calculateFRLPercent(frl: number | null, enrollment: number | null): number | null {
  if (frl === null || !enrollment || enrollment === 0) return null;
  return Math.round((frl / enrollment) * 100);
}
