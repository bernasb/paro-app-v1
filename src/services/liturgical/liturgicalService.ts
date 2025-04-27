import { getFunctions, httpsCallable, HttpsCallableResult, Functions, HttpsCallableOptions } from "firebase/functions";
import { MagisteriumMessage, MagisteriumProxyResponse } from '@/types/magisterium';
import { LiturgicalReading, LiturgicalEvent } from '@/types/liturgical';
import { SaintsAndHistoryResult } from '@/types/saints';
import axios from 'axios';
import { 
  getSummaryWithCache, 
  cleanSummaryText, 
  getEasterVigilSummary,
  saveSummaryToCache
} from '../shared/readingSummariesCache';

// Cache for readings to reduce API calls
const readingsCache: Record<string, { readings: LiturgicalReading[], timestamp: number }> = {}; // Cache enabled
// Cache expiration time (24 hours in milliseconds)
const READINGS_CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Helper for calling the Magisterium proxy Cloud Function
 * @param messages - Array of messages to send to the AI
 * @returns Promise resolving to the proxy response
 * @throws Error if the call fails or returns invalid data
 */
async function callMagisteriumProxy(messages: MagisteriumMessage[]): Promise<MagisteriumProxyResponse> {
  const functions: Functions = getFunctions();
  const callable = httpsCallable<{ messages: MagisteriumMessage[] }, MagisteriumProxyResponse>(
    functions,
    'magisteriumProxy'
  );

  // console.log("Calling Cloud Function with messages:", messages); // Keep commented unless debugging
  const result: HttpsCallableResult<MagisteriumProxyResponse> = await callable({ messages });
  // console.log("Received response from Cloud Function call:", result); // Keep commented unless debugging

  if (!result.data || result.data.status !== 'success') {
    console.error("Cloud function call failed:", result.data);
    const detail = typeof result.data?.data === 'string' ? result.data.data : "AI service processing failed.";
    throw new Error(`Failed to get a valid response from the AI service: ${detail}`);
  }

  return result.data;
}

/**
 * Helper to extract and parse JSON from an AI response string
 * @param contentString - The string containing JSON to extract
 * @param expectedType - Whether to expect an array or object
 * @returns The parsed JSON data
 * @throws Error if parsing fails or data is not of expected type
 */
function extractAndParseJson<T extends object | unknown[]> (
  contentString: string | undefined,
  expectedType: 'array' | 'object'
): T {
  if (!contentString || typeof contentString !== 'string') {
    throw new Error('AI response content is missing or not a string.');
  }

  const startChar = expectedType === 'array' ? '[' : '{';
  const endChar = expectedType === 'array' ? ']' : '}';

  const startIndex = contentString.indexOf(startChar);
  if (startIndex === -1) {
    console.error(`Could not find starting character '${startChar}' in content:`, contentString);
    throw new Error(`Could not find ${expectedType} structure in AI response.`);
  }

  let balance = 0;
  let endIndex = -1;
  for (let i = startIndex; i < contentString.length; i++) {
    if (contentString[i] === startChar) balance++;
    else if (contentString[i] === endChar) balance--;
    if (balance === 0 && i >= startIndex) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    console.error(`Could not find matching end character '${endChar}' for structure starting at index ${startIndex}:`, contentString);
    throw new Error(`Could not find complete ${expectedType} structure in AI response.`);
  }

  const jsonSubstring = contentString.substring(startIndex, endIndex + 1);
  // console.log(`Attempting to parse extracted ${expectedType} substring:`, jsonSubstring); // Keep commented unless debugging

  try {
    const parsedData = JSON.parse(jsonSubstring) as T;
    if (expectedType === 'array' && !Array.isArray(parsedData)) {
      throw new Error('Parsed data was not an array.');
    }
    if (expectedType === 'object' && (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData))) {
      throw new Error('Parsed data was not an object.');
    }
    // console.log(`Successfully extracted and parsed ${expectedType}.`); // Keep commented unless debugging
    return parsedData;
  } catch (parseError) {
    console.error(`Failed to parse extracted JSON ${expectedType}:`, parseError);
    console.error("Extracted substring that failed parsing:", jsonSubstring);
    let message = parseError instanceof Error ? parseError.message : "Unknown parse error";
    throw new Error('Failed to parse extracted AI data: ' + message);
  }
}

/**
 * Helper function to wrap text lines to a specified length.
 * Tries to break at spaces before the limit. Preserves break placeholders.
 * @param text The text to wrap.
 * @param maxLength The desired maximum line length.
 * @returns Text with newlines inserted for wrapping.
 */
function wrapLines(text: string, maxLength: number = 60): string {
  const words = text.split(' ');
  let currentLine = '';
  const lines = [];
  const singleBreakPlaceholder = ' <br/> ';
  const doubleBreakPlaceholder = ' <br/><br/> ';

  for (const word of words) {
    // Handle placeholders by splitting the word if necessary
    let parts: string[] = [];
    let placeholder: string | null = null;

    if (word.includes(doubleBreakPlaceholder)) {
        parts = word.split(doubleBreakPlaceholder);
        placeholder = doubleBreakPlaceholder;
    } else if (word.includes(singleBreakPlaceholder)) {
        parts = word.split(singleBreakPlaceholder);
        placeholder = singleBreakPlaceholder;
    } else {
        parts = [word]; // No placeholder in this word
    }

    let currentPart = parts[0];

    // Process the part before the first placeholder (or the whole word if no placeholder)
    if (!currentLine) {
        currentLine = currentPart;
    } else if (currentLine.length + currentPart.length + 1 <= maxLength) {
        currentLine += ' ' + currentPart;
    } else {
        lines.push(currentLine);
        currentLine = currentPart;
    }

    // Handle placeholders and subsequent parts
    if (placeholder) {
        lines.push(currentLine); // Push line before placeholder
        if (placeholder === doubleBreakPlaceholder) {
           lines.push(''); // Add blank line for double break
        }
         // Start new line with the part after the placeholder
        currentLine = parts.slice(1).join(placeholder);
    }
  }

  // Push the last line
  if (currentLine) {
    lines.push(currentLine);
  }

        return lines.join('\n'); // Use newline characters for wrapping

} // End of wrapLines function


/**
 * Cleans HTML content from Universalis source strings.
 * - Returns raw HTML for Passion Gospels, Psalms, and Acclamations.
 * - Formats other readings: adds breaks after sentences, wraps Gospel lines.
 * @param baseText The raw HTML or text string.
 * @param title The title of the reading.
 * @returns The cleaned or original HTML string.
 */
function cleanHtmlContent(baseText: string, title: string): string {
  // Ensure baseText is a string
  if (typeof baseText !== 'string') {
    console.warn(`cleanHtmlContent received non-string input for title '${title}':`, baseText);
    return '';
  }

  const titleLower = title.toLowerCase();

  // --- Return Raw HTML for specific types ---
  const isPassionFormat = titleLower.includes('gospel') && baseText.includes('<div style=');
  const isPsalm = titleLower.includes('responsorial psalm');
  const isAcclamation = titleLower.includes('gospel acclamation');

  if (isPassionFormat || isPsalm || isAcclamation) {
    // console.log(`Detected special format ('${title}') — returning original HTML.`); // Keep commented unless debugging
    return baseText; // Return original HTML for Card component's formatters
  }

    // --- Default Formatting Logic (First/Second Reading, Standard Gospel, Citations) ---
  // console.log("Applying default formatting for:", title); // Keep commented unless debugging

  // 1. Basic Cleanup & Normalize breaks to \n
  let processedText = baseText.replace(/<br\s*\/?>/gi, '\n').replace(/\r/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/ +\n/g, '\n').replace(/\n +/g, '\n').trim();

  // 2. Wrap lines for standard Gospels (target 50-65 chars)
  if (titleLower === 'gospel') {
     // console.log("Applying line wrapping for Gospel"); // Keep commented unless debugging
     // Temporarily replace double/single newlines to preserve breaks during wrapping
     processedText = processedText.replace(/\n\n/g, ' <br/><br/> '); // Placeholder for double breaks
     processedText = processedText.replace(/\n/g, ' <br/> ');       // Placeholder for single breaks
     processedText = wrapLines(processedText, 60);                 // Apply wrapping logic
     processedText = processedText.replace(/ <br\/> /g, '\n');      // Restore single breaks
     processedText = processedText.replace(/ <br\/><br\/> /g, '\n\n'); // Restore double breaks
  }

  // 3. Add double breaks after likely sentence endings.
  processedText = processedText.replace(/(?<!\d| [A-Z])([.;?!])(?!\.)(\s*\n?)/g, '$1<br /><br />$2');

  // 4. Replace original double newlines (if any left) with double breaks
  processedText = processedText.replace(/\n\n/g, '<br /><br />');

  // 5. Replace remaining single newlines (verse breaks) with single breaks
  processedText = processedText.replace(/\n/g, '<br />');

  // 6. Final Cleanup: Collapse multiple breaks, ensure spacing, trim apostrophe breaks
  processedText = processedText.replace(/(<br\s*\/?>\s*){3,}/gi, '<br /><br />'); // Collapse 3+ breaks into exactly two
  processedText = processedText.replace(/\s*<br\s*\/?>\s*/g, '<br />');       // Normalize spacing around single breaks
  processedText = processedText.replace(/([’'])<br \/>/g, '$1').trim();      // Remove breaks after apostrophes

  // console.log("Default formatted text preview:", processedText.substring(0, 300) + "..."); // Keep commented unless debugging
  return processedText;
} // End of cleanHtmlContent function

// Helper function to escape string for RegExp
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Single line
}

/**
 * Calls the new Firebase Callable Function for daily readings.
 * @param date - The date to get readings for
 * @returns Promise resolving to array of liturgical readings
 */
export const getDailyMassReadings = async (date: Date): Promise<LiturgicalReading[]> => {
  const functions: Functions = getFunctions();
  const callable = httpsCallable<{ date: string }, any>(functions, 'dailyReadingsProxy');
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  const result: HttpsCallableResult<any> = await callable({ date: dateString });
  if (!result.data || result.data.status !== 'success') {
    throw new Error(result.data?.data || 'Failed to fetch daily readings from callable function');
  }
  // Adapt as needed: expects result.data.data to be array of readings
  return result.data.data;
};

/**
 * Calls the new Firebase Callable Function for reading summaries.
 * @param reading - The reading to summarize (title and citation)
 * @returns Promise resolving to an object with summary and optional detailed explanation
 */
export const getReadingSummary = async (reading: { title: string, citation: string }): Promise<{summary: string, detailedExplanation?: string}> => {
  const functions: Functions = getFunctions();
  const callable = httpsCallable<{ title: string, citation: string }, any>(functions, 'readingSummaryProxy');
  const result: HttpsCallableResult<any> = await callable({ title: reading.title, citation: reading.citation });
  if (!result.data || result.data.status !== 'success') {
    throw new Error(result.data?.data || 'Failed to fetch reading summary from callable function');
  }
  // Adapt as needed: expects result.data.summary and result.data.detailedExplanation
  return {
    summary: result.data.summary,
    detailedExplanation: result.data.detailedExplanation
  };
};

/**
 * Gets liturgical events for the specified number of days ahead.
 * @param daysAhead - Number of days ahead to fetch events for (default: 7)
 * @returns Promise resolving to array of liturgical events
 */
export const getLiturgicalEvents = async (daysAhead: number = 7): Promise<LiturgicalEvent[]> => {
  console.log(`Fetching liturgical events for next ${daysAhead} days...`);
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + daysAhead);
  const todayString = today.toISOString().split('T')[0];
  const futureDateString = futureDate.toISOString().split('T')[0];

  const messages: MagisteriumMessage[] = [
    {
      role: "system",
      content: "You are an API endpoint that returns JSON. Respond ONLY with the valid JSON array requested. ABSOLUTELY NO introductory text, explanations, markdown formatting, or anything other than the JSON itself. Your entire response MUST start with '[' and end with ']'. Do not wrap the JSON in markdown code blocks."
    },
    {
      role: "user",
      content: `
        Provide a list of notable Catholic liturgical events (feasts, solemnities, memorials, seasons)
        occurring between ${todayString} and ${futureDateString}.
        For each event, include: name, date (YYYY-MM-DD), description, color.
        Format the entire response as a single, valid JSON array where each object represents an event.
        Ensure the JSON is valid and contains only the array.
      `
    }
  ];

  try {
    const resultData = await callMagisteriumProxy(messages);
    if (resultData.responseType === 'json') {
      const contentString = resultData.data?.choices?.[0]?.message?.content;
      // console.log("Extracted content string from JSON response:", contentString); // Keep commented unless debugging
      return extractAndParseJson<LiturgicalEvent[]>(contentString, 'array');
    } else {
      console.error("Backend indicated response was not JSON:", { type: resultData.responseType, data: resultData.data });
      if ((resultData.responseType === 'text' || resultData.responseType === 'markdown') && typeof resultData.data === 'string') {
        console.warn("Backend returned text/markdown, attempting frontend JSON extraction...");
        return extractAndParseJson<LiturgicalEvent[]>(resultData.data, 'array');
      }
      throw new Error("AI response was not in the expected format and couldn't be processed.");
    }
  } catch (error: unknown) {
    console.error("Error fetching liturgical events via proxy:", error);
    let detail = (error instanceof Error) ? error.message : "Unknown error";
    throw new Error(`Could not fetch liturgical events: ${detail}`);
  }
};

/**
 * Gets saints and historical events for today's date.
 * @returns Promise resolving to saints and history data
 */
export const getSaintsAndHistory = async (): Promise<SaintsAndHistoryResult> => {
  console.log("Fetching saints & history...");
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const messages: MagisteriumMessage[] = [
    {
      role: "system",
      content: "You are an API endpoint that returns JSON. Respond ONLY with the valid JSON object requested. ABSOLUTELY NO introductory text, explanations, markdown formatting, or anything other than the JSON itself. Your entire response MUST start with '{' and end with '}'. Do not wrap the JSON in markdown code blocks."
    },
    {
      role: "user",
      content: `
        Provide information for today's date (${month}/${day}):
        1. The primary saint(s)/feast celebrated.
        2. A few important historical Church events on this date (any year).

        Format the entire response as a single, valid JSON object with two keys: "saintOfTheDay" (an object with keys "name", "feastType", "description", "bornYear", "deathYear") and "historicalEvents" (an array of objects with keys "year", "event", "description").
        Ensure the JSON is valid. If no saint (Feria), make saintOfTheDay null. If no events, make historicalEvents an empty array.
        Ensure the entire response contains ONLY the JSON object.
      `
    }
  ];

  try {
    const resultData = await callMagisteriumProxy(messages);
    if (resultData.responseType === 'json') {
      const contentString = resultData.data?.choices?.[0]?.message?.content;
      // console.log("Extracted content string from JSON response:", contentString); // Keep commented unless debugging
      return extractAndParseJson<SaintsAndHistoryResult>(contentString, 'object');
    } else {
      console.error("Backend indicated response was not JSON:", { type: resultData.responseType, data: resultData.data });
      if ((resultData.responseType === 'text' || resultData.responseType === 'markdown') && typeof resultData.data === 'string') {
        console.warn("Backend returned text/markdown, attempting frontend JSON extraction...");
        return extractAndParseJson<SaintsAndHistoryResult>(resultData.data, 'object');
      }
      throw new Error("AI response was not in the expected format and couldn't be processed.");
    }
  } catch (error: unknown) {
    console.error("Error fetching saints/history via proxy:", error);
    let detail = (error instanceof Error) ? error.message : "Unknown error";
    throw new Error(`Could not fetch saints/history data: ${detail}`);
  }
};
