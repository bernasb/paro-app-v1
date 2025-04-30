import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { errorResponse, successResponse, requireAuth } from '../shared/utils';
import axios from 'axios';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import Magisterium from "magisterium";

const magisterium = new Magisterium({
  apiKey: process.env.MAGISTERIUM_API_KEY,
});

// Secret name for Gemini API key in GCP Secret Manager
const GOOGLE_API_KEY_SECRET = 'GOOGLE_API_KEY';

// Initialize Secret Manager client
const secretManagerClient = new SecretManagerServiceClient();

/**
 * Interface for liturgical reading
 */
interface LiturgicalReading {
  title: string;
  reference: string;
  content?: string;
  citation?: string;
}

/**
 * Interface for CalAPI response
 */
interface CalAPIResponse {
  season: string;
  season_week: number;
  weekday: string;
  celebrations: Array<{
    title: string;
    colour: string;
    rank: string;
    rank_num: number;
  }>;
}

/**
 * Interface for liturgical day information
 */
interface LiturgicalDayInfo {
  api_source: string;
  liturgical_day: string;
  season: string;
  season_week: number;
  weekday: string;
  celebrations: Array<{
    title: string;
    colour: string;
    rank: string;
    rank_num: number;
  }>;
  type: string;
  lectionary: string;
  ferial_lectionary: string;
}

/**
 * Interface for the next special day
 */
interface NextSpecialDay {
  date: string;
  name: string;
  type: string;
}

/**
 * Interface for Mass readings response
 */
interface MassReadingsResponse {
  date: string;
  liturgical_day: string;
  cycles: {
    sunday_cycle: string;
    weekday_cycle: string;
    applicable_cycle: string;
  };
  liturgical_details: {
    type: string;
    season: string;
    season_week: number;
    weekday: string;
    celebrations: Array<{
      title: string;
      colour: string;
      rank: string;
      rank_num: number;
    }>;
    calapi_source: string;
  };
  readings: LiturgicalReading[];
  next_special_day?: NextSpecialDay;
}

/**
 * Helper function to extract the first Sunday of Advent for a given year
 * @param year The year to calculate for
 * @returns Date object for the first Sunday of Advent
 */
function getFirstSundayOfAdvent(year: number): Date {
  const christmasDay = new Date(year, 11, 25); // Month is 0-indexed
  const daysToSubtract = (christmasDay.getDay() + 1) % 7;
  const fourthSundayBeforeChristmas = new Date(christmasDay);
  fourthSundayBeforeChristmas.setDate(christmasDay.getDate() - daysToSubtract - (3 * 7));
  return fourthSundayBeforeChristmas;
}

/**
 * Calculate Easter Sunday date for a given year using the Gregorian algorithm
 * @param year The year to calculate Easter for
 * @returns Date object for Easter Sunday
 */
function calculateEaster(year: number): Date {
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
  
  return new Date(year, month - 1, day); // Month is 0-indexed in JavaScript
}

/**
 * Get a secret from GCP Secret Manager
 * @param secretName Name of the secret to retrieve
 * @returns The secret value
 */
async function getSecret(secretName: string): Promise<string> {
  try {
    // Get the GCP project ID from environment
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    if (!projectId) {
      throw new Error('GCP project ID not found in environment');
    }
    
    // Build the secret path
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    // Access the secret
    const [version] = await secretManagerClient.accessSecretVersion({ name });
    
    // Return the secret payload
    if (version && version.payload && version.payload.data) {
      return version.payload.data.toString();
    }
    throw new Error(`Secret ${secretName} not found or empty`);
  } catch (error) {
    console.error(`[dailyReadingsProxy] Error retrieving secret ${secretName}:`, error);
    throw new Error(`Failed to retrieve secret ${secretName}`);
  }
}

/**
 * Get liturgical day information from calapi.inadiutorium.cz API
 * @param date Date object to get liturgical info for
 * @returns Promise resolving to liturgical day information
 */
async function getLiturgicalDay(date: Date): Promise<LiturgicalDayInfo> {
  try {
    const url = `http://calapi.inadiutorium.cz/api/v0/en/calendars/default/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    console.log(`[dailyReadingsProxy] Fetching CalAPI context from: ${url}`);
    
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Node-Axios/CatholicReadingsFunction' },
      timeout: 15000
    });
    
    const data = response.data;
    const celebrations = data.celebrations || [];
    
    // Sort celebrations by rank_num (highest first)
    celebrations.sort((a: any, b: any) => (b.rank_num || 0) - (a.rank_num || 0));
    
    // Add defaults if missing
    celebrations.forEach((c: any) => {
      c.title = c.title || 'Unknown Celebration';
      c.colour = c.colour || 'unknown';
      c.rank = c.rank || 'unknown';
      c.rank_num = c.rank_num || 0.0;
    });
    
    const primaryCelebration = celebrations[0] || {};
    const liturgicalDayTitle = primaryCelebration.title || 'Unknown';
    const rank = (primaryCelebration.rank || '').toLowerCase();
    const season = (data.season || 'ordinary').toLowerCase();
    const seasonWeek = data.season_week || 0;
    const weekday = (data.weekday || date.toLocaleDateString('en-US', { weekday: 'long' })).toLowerCase();
    
    // Determine Day Type
    let dayType = "Unknown";
    
    if ("solemnity" in rank) {
      dayType = "Solemnity";
    } else if ("feast" in rank && " of the lord" in (primaryCelebration.title || "").toLowerCase()) {
      dayType = "Feast of the Lord";
    } else if ("feast" in rank) {
      dayType = "Feast";
    } else if ("sunday" in rank) {
      dayType = `Sunday of ${season.charAt(0).toUpperCase() + season.slice(1)}` || "Sunday";
    } else if (date.getDay() === 0) { // Sunday (0 = Sunday in JavaScript)
      if (!dayType.includes("Sunday")) {
        dayType = `Sunday of ${season.charAt(0).toUpperCase() + season.slice(1)}` || "Sunday";
      }
    } else if (rank === "memorial") {
      dayType = "Memorial";
    } else if (rank === "optional memorial") {
      dayType = "Optional Memorial";
    } else if (celebrations.length > 0) {
      dayType = (primaryCelebration.rank || "Weekday").replace('_', ' ');
      // Capitalize first letter of each word
      dayType = dayType.replace(/\b\w/g, l => l.toUpperCase());
    } else {
      dayType = "Weekday";
    }
    
    return {
      api_source: "calapi",
      liturgical_day: liturgicalDayTitle,
      season,
      season_week: seasonWeek,
      weekday,
      celebrations,
      type: dayType,
      lectionary: "See cycles",
      ferial_lectionary: "See cycles"
    };
  } catch (error) {
    console.error(`[dailyReadingsProxy] CalAPI request failed for ${date.toISOString().split('T')[0]}: ${error}`);
    
    // Fallback
    const fallbackDayType = date.getDay() === 0 ? "Sunday" : "Weekday";
    return {
      api_source: "fallback",
      liturgical_day: "Unknown (API or Processing Error)",
      season: "unknown",
      season_week: 0,
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
      celebrations: [],
      type: fallbackDayType,
      lectionary: "Unknown",
      ferial_lectionary: "Unknown"
    };
  }
}

/**
 * Find the next special day (Sunday, Solemnity, or Feast) after a given date
 * @param startDate Date to start searching after
 * @param maxDays Maximum number of days to check ahead
 * @returns Promise resolving to information about the next special day, or null if not found
 */
async function findNextSpecialDay(startDate: Date, maxDays = 30): Promise<NextSpecialDay | null> {
  console.log(`[dailyReadingsProxy] Searching for next special day after ${startDate.toISOString().split('T')[0]}...`);
  
  for (let i = 1; i <= maxDays; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(startDate.getDate() + i);
    
    // Get liturgical info for the day being checked
    const dayInfo = await getLiturgicalDay(checkDate);
    
    // Skip if CalAPI had an error for this day
    if (dayInfo.api_source === "fallback") {
      console.warn(`[dailyReadingsProxy] Skipping check for ${checkDate.toISOString().split('T')[0]} due to CalAPI fallback.`);
      continue;
    }
    
    const dayType = dayInfo.type;
    
    // Define criteria for "Special Day"
    const isSpecial = (
      dayType.startsWith("Sunday") ||
      dayType === "Solemnity" ||
      dayType === "Feast" ||
      dayType === "Feast of the Lord"
    );
    
    if (isSpecial) {
      const nextDayData = {
        date: checkDate.toISOString().split('T')[0],
        name: dayInfo.liturgical_day,
        type: dayType
      };
      console.log(`[dailyReadingsProxy] Found next special day: ${nextDayData.name} on ${nextDayData.date}`);
      return nextDayData;
    }
  }
  
  console.warn(`[dailyReadingsProxy] No special day found within the next ${maxDays} days after ${startDate.toISOString().split('T')[0]}.`);
  return null;
}

/**
 * Calculate liturgical cycles for a given date
 * @param date Date to calculate liturgical cycles for
 * @returns Tuple containing Sunday cycle, weekday cycle, applicable cycle type, and liturgical info
 */
async function getLiturgicalCycles(date: Date): Promise<[string, string, string, LiturgicalDayInfo]> {
  const info = await getLiturgicalDay(date);
  const dayType = info.type;
  const liturgicalDayApi = info.liturgical_day;
  
  const isSundayOrMajor = (
    dayType.startsWith("Sunday") ||
    dayType === "Solemnity" ||
    dayType === "Feast of the Lord"
  );
  
  const applicableCycleType = isSundayOrMajor ? "Sunday/Major" : "Weekday";
  
  console.log(`[dailyReadingsProxy] Determining liturgical cycles for ${date.toISOString().split('T')[0]}, Type: ${dayType}, Name: ${liturgicalDayApi}. Applicable Cycle Type: ${applicableCycleType}`);
  
  const year = date.getFullYear();
  
  try {
    const firstAdventPrevYear = getFirstSundayOfAdvent(year - 1);
    const firstAdventCurrYear = getFirstSundayOfAdvent(year);
    
    let liturgicalYearNum;
    
    if (date >= firstAdventCurrYear) {
      liturgicalYearNum = year + 1;
    } else if (date >= firstAdventPrevYear) {
      liturgicalYearNum = year;
    } else {
      liturgicalYearNum = year;
      console.warn(`[dailyReadingsProxy] Date ${date.toISOString().split('T')[0]} seems to be before Advent ${year-1}. Assigning to LY ${year}.`);
    }
    
    console.log(`[dailyReadingsProxy] Date ${date.toISOString().split('T')[0]} is in Liturgical Year ${liturgicalYearNum}`);
    
    const cycleMod = liturgicalYearNum % 3;
    const sundayCycle = cycleMod === 1 ? "A" : cycleMod === 2 ? "B" : "C";
    
    const weekdayCycleCalc = date.getFullYear() % 2 !== 0 ? "I" : "II";
    const finalWeekdayCycle = applicableCycleType === "Sunday/Major" ? "N/A" : weekdayCycleCalc;
    
    console.log(`[dailyReadingsProxy] Calculated Cycles: Sunday Cycle = Year ${sundayCycle}, Weekday Cycle = ${finalWeekdayCycle} (based on ${applicableCycleType})`);
    
    return [sundayCycle, finalWeekdayCycle, applicableCycleType, info];
  } catch (error) {
    console.error(`[dailyReadingsProxy] Error during liturgical cycle calculation: ${error}`);
    return ["?", "?", applicableCycleType, info];
  }
}

/**
 * Fetch Mass reading references using Magisterium API
 * @param date Date to fetch readings for
 * @returns Promise resolving to processed Mass readings data
 */
export async function fetchReadingReferencesMagisterium(date: Date): Promise<MassReadingsResponse> {
  const dateString = date.toISOString().split('T')[0];
  console.log('[MAGISTERIUM_DEBUG] Fetching readings from Magisterium for', dateString);
  const prompt = `What are the official Catholic Mass readings for ${dateString}? Please provide only the scripture references for the First Reading, Responsorial Psalm, and Gospel.`;

  const results = await magisterium.chat.completions.create({
    model: "magisterium-1",
    messages: [
      { role: "user", content: prompt }
    ]
  });
  const content = results.choices[0].message.content ?? '';

  // Attempt to extract references for each reading type
  const readings: LiturgicalReading[] = [];
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/first reading/i.test(line)) {
      readings.push({ title: "First Reading", reference: line.replace(/first reading[:\-]?/i, '').trim() });
    } else if (/responsorial psalm/i.test(line)) {
      readings.push({ title: "Responsorial Psalm", reference: line.replace(/responsorial psalm[:\-]?/i, '').trim() });
    } else if (/gospel/i.test(line)) {
      readings.push({ title: "Gospel", reference: line.replace(/gospel[:\-]?/i, '').trim() });
    }
  }
  // Remove fallback: throw if no readings parsed
  if (readings.length === 0) {
    throw new Error(`Could not parse readings from Magisterium API response for ${dateString}. Raw content: ${content}`);
  }

  // Compose response (other fields can be filled as needed)
  return {
    date: dateString,
    liturgical_day: '',
    cycles: {
      sunday_cycle: '',
      weekday_cycle: '',
      applicable_cycle: ''
    },
    liturgical_details: {
      type: '',
      season: '',
      season_week: 0,
      weekday: '',
      celebrations: [],
      calapi_source: ''
    },
    readings,
    next_special_day: undefined
  };
}

/**
 * Cloud Function to fetch daily Mass readings
 * Callable function that expects a date parameter (YYYY-MM-DD format)
 */
export const dailyReadingsProxy = onCall(async (request: CallableRequest<any>) => {
  try {
    // Ensure user is authenticated
    requireAuth(request);
    
    // Get and validate date parameter
    const { date } = request.data;
    if (!date) {
      console.error('[dailyReadingsProxy] Missing date parameter');
      throw new HttpsError('invalid-argument', 'Missing "date" parameter');
    }
    
    console.log(`[dailyReadingsProxy] Processing request for date: ${date}`);
    
    // Parse the date string (expected format: YYYY-MM-DD)
    let dateObj: Date;
    try {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (err) {
      console.error(`[dailyReadingsProxy] Invalid date format: ${date}`);
      throw new HttpsError('invalid-argument', 'Invalid date format. Please use YYYY-MM-DD.');
    }
    
    // Get the readings
    const result = await fetchReadingReferencesMagisterium(dateObj);

    // Map Python readings to LiturgicalReading format expected by frontend
    const frontendReadings = (result.readings || []).map((reading: any) => ({
      title: reading.title,
      citation: reading.reference, // Map reference to citation
      summary: undefined,
      detailedExplanation: undefined,
      summaryLoading: true,
      summaryError: undefined,
    }));

    // Return the mapped readings array directly
    return successResponse(frontendReadings);
  } catch (error: any) {
    console.error('[dailyReadingsProxy] Error:', error);
    return errorResponse(error.message || 'Failed to fetch daily readings.');
  }
});
