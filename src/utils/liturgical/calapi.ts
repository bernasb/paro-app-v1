import axios from 'axios';

// Types for CalAPI
export interface CalapiCelebration {
  title: string;
  colour: 'green' | 'violet' | 'white' | 'red';
  rank: string;
  rank_num: number;
}

export interface CalapiDay {
  date: string; // ISO date
  season: 'advent' | 'christmas' | 'lent' | 'easter' | 'ordinary';
  season_week: number;
  celebrations: CalapiCelebration[];
  weekday: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
}

export interface CalapiYear {
  lectionary: 'A' | 'B' | 'C';
  ferial_lectionary: 1 | 2;
}

// --- Liturgical Calendar Calculation Helpers ---

/**
 * Calculate date of Western (Gregorian) Easter Sunday for a given year.
 * Returns a Date object.
 */
export function calculateEaster(year: number): Date {
  // Meeus/Jones/Butcher Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Calculate the date of the First Sunday of Advent for a given year.
 * Returns a Date object.
 */
export function calculateFirstSundayOfAdvent(year: number): Date {
  // Advent begins on the fourth Sunday before Christmas
  const christmas = new Date(year, 11, 25); // December 25
  // Find the Sunday on or before Dec 24
  let sundayBeforeChristmas = new Date(year, 11, 24);
  while (sundayBeforeChristmas.getDay() !== 0) {
    sundayBeforeChristmas.setDate(sundayBeforeChristmas.getDate() - 1);
  }
  // Go back 3 more Sundays
  sundayBeforeChristmas.setDate(sundayBeforeChristmas.getDate() - 21);
  return sundayBeforeChristmas;
}

// --- Cycle Calculation Helpers (User-corrected logic) ---
/**
 * Get the correct liturgical year for a given date (Advent start).
 * If before Advent, use previous year; otherwise, use current year.
 */
function getLiturgicalYearForDate(date: Date): number {
  const year = date.getFullYear();
  const advent = calculateFirstSundayOfAdvent(year);
  return date < advent ? year - 1 : year;
}

/**
 * Get the correct Sunday lectionary cycle (A/B/C) for a given liturgical year.
 * Year A: years where (year % 3) === 0
 * Year B: years where (year % 3) === 1
 * Year C: years where (year % 3) === 2
 */
function getSundayCycle(liturgicalYear: number): 'A' | 'B' | 'C' {
  return ['A', 'B', 'C'][liturgicalYear % 3] as 'A' | 'B' | 'C';
}

/**
 * Get the correct weekday cycle (I/II) for a given civil year.
 * Odd years: I, Even years: II
 */
function getWeekdayCycleLabel(civilYear: number): 'I' | 'II' {
  return civilYear % 2 === 0 ? 'II' : 'I';
}

/**
 * Get a comprehensive liturgical context for a given date.
 * Combines CalAPI data and our own calculations for maximum accuracy.
 * Uses liturgical year for Sunday cycle, civil year for weekday cycle.
 * Returns field names matching the Python output for easier UI integration.
 */
export async function getLiturgicalContext(date: Date, lang = 'en', calendar = 'default') {
  const [day] = await Promise.all([
    fetchCalapiDay(date, lang, calendar)
  ]);
  const liturgicalYear = getLiturgicalYearForDate(date);
  const civilYear = date.getFullYear();
  // Supplement with our own calculations
  const easter = calculateEaster(civilYear);
  const advent = calculateFirstSundayOfAdvent(civilYear);

  // Use user-corrected logic for cycles
  const sunday_cycle = `Year ${getSundayCycle(liturgicalYear)}`;
  const weekday_cycle = getWeekdayCycleLabel(civilYear);
  const applicable_cycle = day.weekday === 'sunday' ? 'Sunday' : 'Weekday';

  return {
    date: day.date,
    liturgical_day: day.celebrations && day.celebrations[0] ? day.celebrations[0].title : '',
    cycles: {
      sunday_cycle,
      weekday_cycle,
      applicable_cycle
    },
    liturgical_details: {
      type: day.celebrations && day.celebrations[0] ? capitalizeFirst(day.celebrations[0].rank) : '',
      season: day.season,
      season_week: day.season_week,
      weekday: day.weekday,
      celebrations: day.celebrations,
      calapi_source: 'calapi',
      easter,
      firstSundayOfAdvent: advent
    }
  };
}

// Helper to capitalize first letter
function capitalizeFirst(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Fetch CalAPI day info for a given date (default: today)
 */
export async function fetchCalapiDay(
  date: Date = new Date(),
  lang: string = 'en',
  calendar: string = 'default'
): Promise<CalapiDay> {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const url = `http://calapi.inadiutorium.cz/api/v0/${lang}/calendars/${calendar}/${yyyy}/${mm}/${dd}`;
  const { data } = await axios.get<CalapiDay>(url);
  return data;
}

/**
 * Fetch CalAPI year info for a given year
 */
export async function fetchCalapiYear(
  year: number,
  lang: string = 'en',
  calendar: string = 'default'
): Promise<CalapiYear> {
  const url = `http://calapi.inadiutorium.cz/api/v0/${lang}/calendars/${calendar}/${year}`;
  const { data } = await axios.get<CalapiYear>(url);
  return data;
}

/**
 * Utility to get current date/time and time zone info
 */
export function getCurrentDateTimeInfo() {
  const now = new Date();
  const iso = now.toISOString();
  const local = now.toLocaleString();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { now, iso, local, tz };
}
