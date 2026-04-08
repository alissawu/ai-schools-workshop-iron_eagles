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
  phone?: string;
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

// District data is bundled as static JSON per state (from NCES CCD 2022-23)
export async function fetchDistricts(fips: number): Promise<District[]> {
  const url = `${import.meta.env.BASE_URL}data/districts/${fips}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load district data for FIPS ${fips}`);
  const data: District[] = await res.json();
  return data;
}

// Schools are bundled as static JSON per state (from NCES CCD 2022-23)
// The JSON is keyed by leaid, so we need to know the state fips
let schoolsCache: Record<number, Record<string, School[]>> = {};

// Reset cache (for testing)
export function resetSchoolsCache() {
  schoolsCache = {};
}

export async function fetchSchoolsInDistrict(leaid: string): Promise<School[]> {
  // Extract fips from leaid (first 2 digits)
  const fips = parseInt(leaid.substring(0, 2), 10);
  
  // Load schools for this state if not cached
  if (!schoolsCache[fips]) {
    const url = `${import.meta.env.BASE_URL}data/schools/${fips}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load school data for FIPS ${fips}`);
    schoolsCache[fips] = await res.json();
  }
  
  const schools = schoolsCache[fips][leaid] || [];
  
  // Map to expected School interface
  return schools
    .filter((s: any) => s.enrollment && s.enrollment > 0)
    .map((s: any) => ({
      ncessch: s.ncessch,
      school_name: s.school_name,
      lea_name: '', // Not in bundled data
      city_location: s.city,
      state_location: s.state,
      zip_location: s.zip,
      latitude: s.lat,
      longitude: s.lon,
      school_level: 0, // TODO: map level string
      school_type: s.charter ? 1 : 0,
      charter: s.charter ? 1 : 0,
      magnet: null,
      enrollment: s.enrollment,
      teachers_fte: s.teachers_fte,
      free_lunch: null,
      reduced_price_lunch: null,
      free_or_reduced_price_lunch: null,
      lowest_grade_offered: 0,
      highest_grade_offered: 12,
    }));
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

// Race code mapping from CCD
export const RACE_LABELS: Record<number, string> = {
  1: 'White',
  2: 'Black',
  3: 'Hispanic',
  4: 'Asian',
  5: 'American Indian/Alaska Native',
  6: 'Native Hawaiian/Pacific Islander',
  7: 'Two or More Races',
  9: 'Unknown',
  99: 'Total',
};

export const RACE_COLORS: Record<number, string> = {
  1: '#6366f1', // indigo
  2: '#f59e0b', // amber
  3: '#ef4444', // red
  4: '#10b981', // emerald
  5: '#8b5cf6', // violet
  6: '#06b6d4', // cyan
  7: '#f97316', // orange
  9: '#94a3b8', // slate
};

export interface DemographicEntry {
  race: number;
  sex: number;
  enrollment: number | null;
  leaid: string;
  year: number;
  fips: number;
  grade: number;
}

export interface DemographicBreakdown {
  label: string;
  race: number;
  enrollment: number;
  percent: number;
  color: string;
}

export async function fetchDemographics(leaid: string): Promise<DemographicBreakdown[] | null> {
  const url = `${BASE_URL}/school-districts/ccd/enrollment/${YEAR}/race/?leaid=${leaid}&grade=99`;
  const res = await fetch(url);
  const data = await res.json();
  const results: DemographicEntry[] = data.results || [];

  // Filter to total across sex (sex=99) and exclude total race (99)
  const raceRows = results.filter(
    (r) => r.sex === 99 && r.race !== 99 && r.enrollment && r.enrollment > 0
  );

  if (raceRows.length === 0) return null;

  const totalEnrollment = raceRows.reduce((sum, r) => sum + (r.enrollment || 0), 0);
  if (totalEnrollment === 0) return null;

  return raceRows
    .map((r) => ({
      label: RACE_LABELS[r.race] || `Race ${r.race}`,
      race: r.race,
      enrollment: r.enrollment!,
      percent: Math.round((r.enrollment! / totalEnrollment) * 1000) / 10,
      color: RACE_COLORS[r.race] || '#94a3b8',
    }))
    .sort((a, b) => b.enrollment - a.enrollment);
}

// Niche integration - generates a Niche URL for a district
export function getNicheDistrictUrl(districtName: string, stateAbbr: string): string {
  const slug = districtName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const state = stateAbbr.toLowerCase();
  return `https://www.niche.com/k12/d/${slug}-${state}/`;
}

// Niche URL for a school
export function getNicheSchoolUrl(schoolName: string, city: string, stateAbbr: string): string {
  const slug = `${schoolName} ${city} ${stateAbbr}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://www.niche.com/k12/${slug}/`;
}

// ---------------------------------------------------------------------------
// Niche companion server integration
// ---------------------------------------------------------------------------

const NICHE_SERVER = 'http://localhost:8080';

export interface NicheGrades {
  overall_grade: string | null;
  grades: Record<string, string>;
}

export interface NicheReviews {
  average: number;
  count: number;
}

export interface NicheRanking {
  display: string;
  ordinal?: number;
  total?: number;
}

export interface NicheDistrictData {
  overall_grade: string | null;
  grades: Record<string, string>;
  enrollment?: number;
  student_teacher_ratio?: number;
  graduation_rate?: number;
  math_proficiency?: number;
  reading_proficiency?: number;
  reviews?: NicheReviews;
  rankings?: NicheRanking[];
  schools?: NicheSchoolSummary[];
  niche_url: string;
  nces_id?: string;
}

export interface NicheSchoolSummary {
  name: string;
  ncessch?: string;
  overall_grade?: string;
  enrollment?: number;
  student_teacher_ratio?: number;
  reviews?: NicheReviews;
}

export interface NicheSchoolData {
  overall_grade: string | null;
  grades: Record<string, string>;
  enrollment?: number;
  student_teacher_ratio?: number;
  graduation_rate?: number;
  reviews?: NicheReviews;
  rankings?: NicheRanking[];
  niche_url: string;
  nces_id?: string;
}

let nicheServerAvailable: boolean | null = null;

async function checkNicheServer(): Promise<boolean> {
  if (nicheServerAvailable !== null) return nicheServerAvailable;
  try {
    const res = await fetch(`${NICHE_SERVER}/health`, { signal: AbortSignal.timeout(2000) });
    nicheServerAvailable = res.ok;
  } catch {
    nicheServerAvailable = false;
  }
  return nicheServerAvailable;
}

export async function fetchNicheDistrict(
  name: string,
  state: string,
  leaid?: string
): Promise<NicheDistrictData | null> {
  if (!(await checkNicheServer())) return null;
  
  const params = new URLSearchParams({ name, state });
  if (leaid) params.set('leaid', leaid);
  
  try {
    const res = await fetch(`${NICHE_SERVER}/niche/district?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchNicheSchool(
  name: string,
  city: string,
  state: string,
  ncessch?: string
): Promise<NicheSchoolData | null> {
  if (!(await checkNicheServer())) return null;
  
  const params = new URLSearchParams({ name, city, state });
  if (ncessch) params.set('ncessch', ncessch);
  
  try {
    const res = await fetch(`${NICHE_SERVER}/niche/school?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
