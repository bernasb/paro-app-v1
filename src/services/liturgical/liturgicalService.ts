import {
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
  Functions,
  HttpsCallableOptions,
} from 'firebase/functions';
import { MagisteriumMessage, MagisteriumProxyResponse } from '@/types/magisterium';
import { LiturgicalReading, LiturgicalEvent } from '@/types/liturgical';
import { SaintsAndHistoryResult } from '@/types/saints';
import axios from 'axios';
// import { getSummaryWithCache, cleanSummaryText, getEasterVigilSummary, saveSummaryToCache } from '../shared/readingSummariesCache';

// Cache for readings to reduce API calls
// const readingsCache: Record<string, { readings: LiturgicalReading[]; timestamp: number }> = {}; // Cache enabled
// Cache expiration time (24 hours in milliseconds)
// const READINGS_CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Helper for calling the Magisterium proxy Cloud Function
 * @param messages - Array of messages to send to the AI
 * @returns Promise resolving to the proxy response
 * @throws Error if the call fails or returns invalid data
 */
async function callMagisteriumProxy(
  messages: MagisteriumMessage[],
): Promise<MagisteriumProxyResponse> {
  const functions: Functions = getFunctions();
  const callable = httpsCallable<{ messages: MagisteriumMessage[] }, MagisteriumProxyResponse>(
    functions,
    'magisteriumProxy',
  );

  // console.log("Calling Cloud Function with messages:", messages); // Keep commented unless debugging
  const result: HttpsCallableResult<MagisteriumProxyResponse> = await callable({ messages });
  // console.log("Received response from Cloud Function call:", result); // Keep commented unless debugging

  if (!result.data || result.data.status !== 'success') {
    console.error('Cloud function call failed:', result.data);
    const detail =
      typeof result.data?.data === 'string' ? result.data.data : 'AI service processing failed.';
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
function extractAndParseJson<T extends object | unknown[]>(
  contentString: string | undefined,
  expectedType: 'array' | 'object',
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
    console.error(
      `Could not find matching end character '${endChar}' for structure starting at index ${startIndex}:`,
      contentString,
    );
    throw new Error(`Could not find complete ${expectedType} structure in AI response.`);
  }

  const jsonSubstring = contentString.substring(startIndex, endIndex + 1);
  // console.log(`Attempting to parse extracted ${expectedType} substring:`, jsonSubstring); // Keep commented unless debugging

  try {
    const parsedData = JSON.parse(jsonSubstring) as T;
    if (expectedType === 'array' && !Array.isArray(parsedData)) {
      throw new Error('Parsed data was not an array.');
    }
    if (
      expectedType === 'object' &&
      (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData))
    ) {
      throw new Error('Parsed data was not an object.');
    }
    // console.log(`Successfully extracted and parsed ${expectedType}.`); // Keep commented unless debugging
    return parsedData;
  } catch (parseError) {
    console.error(`Failed to parse extracted JSON ${expectedType}:`, parseError);
    console.error('Extracted substring that failed parsing:', jsonSubstring);
    const message = parseError instanceof Error ? parseError.message : 'Unknown parse error';
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

    const currentPart = parts[0];

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
  let processedText = baseText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n')
    .trim();

  // 2. Wrap lines for standard Gospels (target 50-65 chars)
  if (titleLower === 'gospel') {
    // console.log("Applying line wrapping for Gospel"); // Keep commented unless debugging
    // Temporarily replace double/single newlines to preserve breaks during wrapping
    processedText = processedText.replace(/\n\n/g, ' <br/><br/> '); // Placeholder for double breaks
    processedText = processedText.replace(/\n/g, ' <br/> '); // Placeholder for single breaks
    processedText = wrapLines(processedText, 60); // Apply wrapping logic
    processedText = processedText.replace(/ <br\/> /g, '\n'); // Restore single breaks
    processedText = processedText.replace(/ <br\/><br\/> /g, '\n\n'); // Restore double breaks
  }

  // 3. Add double breaks after likely sentence endings.
  processedText = processedText.replace(
    /(?<!\d| [A-Z])([.;?!])(?!\.)(\s*\n?)/g,
    '$1<br /><br />$2',
  );

  // 4. Replace original double newlines (if any left) with double breaks
  processedText = processedText.replace(/\n\n/g, '<br /><br />');

  // 5. Replace remaining single newlines (verse breaks) with single breaks
  processedText = processedText.replace(/\n/g, '<br />');

  // 6. Final Cleanup: Collapse multiple breaks, ensure spacing, trim apostrophe breaks
  processedText = processedText.replace(/(<br\s*\/?>\s*){3,}/gi, '<br /><br />'); // Collapse 3+ breaks into exactly two
  processedText = processedText.replace(/\s*<br\s*\/?>\s*/g, '<br />'); // Normalize spacing around single breaks
  processedText = processedText.replace(/([’'])<br \/>/g, '$1').trim(); // Remove breaks after apostrophes

  // console.log("Default formatted text preview:", processedText.substring(0, 300) + "..."); // Keep commented unless debugging
  return processedText;
} // End of cleanHtmlContent function

// Helper function to escape string for RegExp
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Single line
}

/**
 * Fetch daily Mass readings using the Magisterium Proxy (AI Assistant)
 */
export async function getDailyMassReadings(dateString: string): Promise<any[]> {
  try {
    const functions = getFunctions();
    const magisteriumProxy = httpsCallable(functions, 'magisteriumProxy');
    // Strongly instruct the AI to return only JSON
    const prompt = `What are the official Catholic Mass readings for ${dateString}? Respond ONLY with a valid JSON array of objects, each with "title" and "citation" fields. For example: [{"title":"First Reading","citation":"Acts 4:32-37"}, ...]. Do NOT include any other text.`;
    
    console.log('[getDailyMassReadings] Sending prompt to Magisterium:', prompt);
    const result = await magisteriumProxy({
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Debug: Log the actual response structure
    console.log('[getDailyMassReadings] Raw response:', JSON.stringify(result.data, null, 2));

    // Type assertion to avoid TypeScript errors while keeping the flexible access
    const responseData = result.data as any;

    // Extract content using more flexible access paths
    let content = '';
    
    // Try multiple possible response structures
    if (responseData?.choices?.[0]?.message?.content) {
      // Standard OpenAI-like format
      content = responseData.choices[0].message.content;
    } else if (typeof responseData?.data === 'string') {
      // Wrapped in a data property (common in Firebase callable functions)
      content = responseData.data;
    } else if (responseData?.data?.choices?.[0]?.message?.content) {
      // Nested inside data property with OpenAI structure
      content = responseData.data.choices[0].message.content;
    } else if (typeof responseData === 'string') {
      // Direct string response
      content = responseData;
    } else {
      console.error('[getDailyMassReadings] Unexpected response structure:', responseData);
      throw new Error('Cannot extract content from Magisterium response. See console for details.');
    }

    console.log('[getDailyMassReadings] Extracted content:', content);

    // Strip any Markdown code block formatting - ensure ALL backticks are removed
    const cleanedContent = content
      .replace(/^```(json|javascript|js)?[\s\n]*/i, '') // Remove opening code fence
      .replace(/[\s\n]*```[\s\n`]*/ig, '') // Remove closing code fence with any extra backticks
      .trim();
    console.log('[getDailyMassReadings] Cleaned content for parsing:', cleanedContent);

    try {
      // Try to parse as JSON first
      const readings = JSON.parse(cleanedContent);
      console.log('[getDailyMassReadings] Successfully parsed JSON:', readings);
      if (!Array.isArray(readings)) throw new Error('Not an array');
      
      // Return directly with correct title and citation values
      return readings.map(reading => ({
        title: reading.title || '',
        citation: reading.citation || '',
        summaryLoading: true,
        summaryError: undefined
      }));
    } catch (jsonErr) {
      console.log('[getDailyMassReadings] JSON parsing failed, falling back to line parsing. Error:', jsonErr);
      
      // Try extracting from the original content directly since we have JSON structure
      // even if it didn't fully parse
      const titleRegex = /"title"\s*:\s*"([^"]*)"/g;
      const citationRegex = /"citation"\s*:\s*"([^"]*)"/g;
      
      const titles: string[] = [];
      const citations: string[] = [];
      
      let match;
      while ((match = titleRegex.exec(content)) !== null) {
        titles.push(match[1]);
      }
      
      while ((match = citationRegex.exec(content)) !== null) {
        citations.push(match[1]);
      }
      
      console.log('[getDailyMassReadings] Extracted titles:', titles);
      console.log('[getDailyMassReadings] Extracted citations:', citations);
      
      if (titles.length > 0 && citations.length === titles.length) {
        return titles.map((title, index) => ({
          title,
          citation: citations[index],
          summaryLoading: true,
          summaryError: undefined
        }));
      }
      
      // If all else fails, last resort: fallback to line parsing
      const fallbackReadings: any[] = [];
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (/first reading/i.test(line)) {
          fallbackReadings.push({ 
            title: "First Reading", 
            citation: line.replace(/first reading[:\-]?/i, '').trim(),
            summaryLoading: true,
            summaryError: undefined
          });
        } else if (/responsorial psalm/i.test(line)) {
          fallbackReadings.push({ 
            title: "Responsorial Psalm", 
            citation: line.replace(/responsorial psalm[:\-]?/i, '').trim(),
            summaryLoading: true,
            summaryError: undefined
          });
        } else if (/gospel/i.test(line)) {
          fallbackReadings.push({ 
            title: "Gospel", 
            citation: line.replace(/gospel[:\-]?/i, '').trim(),
            summaryLoading: true,
            summaryError: undefined
          });
        }
      }
      
      if (fallbackReadings.length > 0) {
        return fallbackReadings;
      }
      
      throw new Error("Could not parse readings from Magisterium response.");
    }
  } catch (error: any) {
    console.error('[getDailyMassReadings] Error (Magisterium Proxy):', error);
    throw error;
  }
}

/**
 * Calls the new Firebase Callable Function for reading summaries.
 * @param reading - The reading to summarize (title and citation)
 * @returns Promise resolving to an object with summary and optional detailed explanation
 */
export const getReadingSummary = async (reading: {
  title: string;
  citation: string;
}): Promise<{ summary: string; summaryError: string; detailedExplanation?: string; citations?: any[] }> => {
  const functions: Functions = getFunctions();
  const callable = httpsCallable<{ title: string; citation: string }, any>(
    functions,
    'readingSummaryProxy',
  );
  
  console.log(`[getReadingSummary] Requesting summary for ${reading.title} (${reading.citation})`);
  
  const result: HttpsCallableResult<any> = await callable({
    title: reading.title,
    citation: reading.citation,
  });
  
  if (!result.data || result.data.status !== 'success') {
    throw new Error(result.data?.data || 'Failed to fetch reading summary from callable function');
  }
  
  console.log(`[getReadingSummary] Received summary response:`, result.data);
  
  // Return summary, detailed explanation (if any), and citations (if any)
  return {
    summary: result.data.data.summary || '',
    summaryError: result.data.data.summaryError || '',
    detailedExplanation: result.data.data.detailedExplanation || '',
    citations: result.data.data.citations || []
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
      role: 'system',
      content:
        "You are an API endpoint that returns JSON. Respond ONLY with the valid JSON array requested. ABSOLUTELY NO introductory text, explanations, markdown formatting, or anything other than the JSON itself. Your entire response MUST start with '[' and end with ']'. Do not wrap the JSON in markdown code blocks.",
    },
    {
      role: 'user',
      content: `
        Provide a list of notable Catholic liturgical events (feasts, solemnities, memorials, seasons)
        occurring between ${todayString} and ${futureDateString}.
        For each event, include: name, date (YYYY-MM-DD), description, color.
        Format the entire response as a single, valid JSON array where each object represents an event.
        Ensure the JSON is valid and contains only the array.
      `,
    },
  ];

  try {
    const resultData = await callMagisteriumProxy(messages);
    if (resultData.responseType === 'json') {
      const contentString = resultData.data?.choices?.[0]?.message?.content;
      // console.log("Extracted content string from JSON response:", contentString); // Keep commented unless debugging
      return extractAndParseJson<LiturgicalEvent[]>(contentString, 'array');
    } else {
      console.error('Backend indicated response was not JSON:', {
        type: resultData.responseType,
        data: resultData.data,
      });
      if (
        (resultData.responseType === 'text' || resultData.responseType === 'markdown') &&
        typeof resultData.data === 'string'
      ) {
        console.warn('Backend returned text/markdown, attempting frontend JSON extraction...');
        return extractAndParseJson<LiturgicalEvent[]>(resultData.data, 'array');
      }
      throw new Error("AI response was not in the expected format and couldn't be processed.");
    }
  } catch (error: unknown) {
    console.error('Error fetching liturgical events via proxy:', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Could not fetch liturgical events: ${detail}`);
  }
};

/**
 * Gets saints and historical events for today's date.
 * @returns Promise resolving to saints and history data
 */
export const getSaintsAndHistory = async (): Promise<SaintsAndHistoryResult> => {
  console.log('Fetching saints & history...');
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const messages: MagisteriumMessage[] = [
    {
      role: 'system',
      content:
        "You are an API endpoint that returns JSON. Respond ONLY with the valid JSON object requested. ABSOLUTELY NO introductory text, explanations, markdown formatting, or anything other than the JSON itself. Your entire response MUST start with '{' and end with '}'. Do not wrap the JSON in markdown code blocks.",
    },
    {
      role: 'user',
      content: `
        Provide information for today's date (${month}/${day}):
        1. The primary saint(s)/feast celebrated.
        2. A few important historical Church events on this date (any year).

        Format the entire response as a single, valid JSON object with two keys: "saintOfTheDay" (an object with keys "name", "feastType", "description", "bornYear", "deathYear") and "historicalEvents" (an array of objects with keys "year", "event", "description").
        Ensure the JSON is valid. If no saint (Feria), make saintOfTheDay null. If no events, make historicalEvents an empty array.
        Ensure the entire response contains ONLY the JSON object.
      `,
    },
  ];

  try {
    const resultData = await callMagisteriumProxy(messages);
    if (resultData.responseType === 'json') {
      const contentString = resultData.data?.choices?.[0]?.message?.content;
      // console.log("Extracted content string from JSON response:", contentString); // Keep commented unless debugging
      return extractAndParseJson<SaintsAndHistoryResult>(contentString, 'object');
    } else {
      console.error('Backend indicated response was not JSON:', {
        type: resultData.responseType,
        data: resultData.data,
      });
      if (
        (resultData.responseType === 'text' || resultData.responseType === 'markdown') &&
        typeof resultData.data === 'string'
      ) {
        console.warn('Backend returned text/markdown, attempting frontend JSON extraction...');
        return extractAndParseJson<SaintsAndHistoryResult>(resultData.data, 'object');
      }
      throw new Error("AI response was not in the expected format and couldn't be processed.");
    }
  } catch (error: unknown) {
    console.error('Error fetching saints/history via proxy:', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Could not fetch saints/history data: ${detail}`);
  }
};
