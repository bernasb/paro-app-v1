import { getFunctions, httpsCallable } from 'firebase/functions';
import { MagisteriumMessage, MagisteriumProxyResponse } from '../../types/magisterium';
import { LiturgicalReading, LiturgicalEvent } from '../../types/liturgical';
import { SaintsAndHistoryResult } from '../../types/saints';

// Cache for readings to reduce API calls
const readingsCache: Record<string, LiturgicalReading[]> = {};

// Helper for Magisterium proxy
async function callMagisteriumProxy(
  messages: MagisteriumMessage[],
): Promise<MagisteriumProxyResponse> {
  const functions = getFunctions();
  const callable = httpsCallable(functions, 'magisteriumProxy');

  console.log('Calling Cloud Function with messages:', messages);
  const result = (await callable({ messages })) as { data: MagisteriumProxyResponse };
  console.log('Received response from Cloud Function call:', result);

  if (!result.data || !result.data.status) {
    console.error('Invalid response structure from Cloud Function call result:', result);
    throw new Error('Received an invalid response structure from the AI service proxy.');
  }

  if (result.data.status !== 'success') {
    console.error('Cloud function call failed:', result.data);
    const detail =
      typeof result.data.data === 'string' ? result.data.data : 'AI service processing failed.';
    throw new Error(`Failed to get a valid response from the AI service: ${detail}`);
  }

  return result.data as MagisteriumProxyResponse;
}

// Helper to extract JSON from potential AI response string
function extractAndParseJson(contentString: string | undefined, expectedType: 'array' | 'object') {
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
  console.log(`Attempting to parse extracted ${expectedType} substring:`, jsonSubstring);

  try {
    const parsedData = JSON.parse(jsonSubstring);
    if (expectedType === 'array' && !Array.isArray(parsedData)) {
      throw new Error('Parsed data was not an array.');
    }
    if (
      expectedType === 'object' &&
      (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData))
    ) {
      throw new Error('Parsed data was not an object.');
    }
    console.log(`Successfully extracted and parsed ${expectedType}.`);
    return parsedData;
  } catch (parseError) {
    console.error(`Failed to parse extracted JSON ${expectedType}:`, parseError);
    console.error('Extracted substring that failed parsing:', jsonSubstring);
    const message = parseError instanceof Error ? parseError.message : 'Unknown parse error';
    throw new Error('Failed to parse extracted AI data: ' + message);
  }
}

// Helper function: Decodes entities and preserves structure from HTML
function cleanHtmlContent(htmlString: string, title?: string): string {
  if (typeof document === 'undefined') {
    // Basic fallback for SSR or testing
    return htmlString
      .replace(/<br>/g, '\n')
      .replace(/<br\/>/g, '\n')
      .replace(/<div>/g, '')
      .replace(/<\/div>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&lsquo;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .trim();
  }

  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // Different handling based on reading type
    if (title === 'First Reading' || title === 'Responsorial Psalm') {
      // For First Reading and Psalm: preserve line breaks from div elements
      const verses = tempDiv.querySelectorAll('div.v, div.vi, div.v.gb');
      if (verses.length > 0) {
        // If we found the expected structure
        const lines: string[] = [];
        verses.forEach((verse) => {
          let line = verse.textContent || '';
          // Add indentation for psalm responses (class "vi")
          if (verse.classList.contains('vi')) {
            line = '  ' + line; // Add indentation
          }
          lines.push(line.trim());
        });
        return lines.join('\n');
      }
    } else if (title === 'Second Reading' || title === 'Gospel') {
      // For Second Reading and Gospel: preserve paragraph breaks
      const paragraphs = tempDiv.querySelectorAll('div.p, div.pi');
      if (paragraphs.length > 0) {
        // If we found the expected structure
        const paras: string[] = [];
        paragraphs.forEach((para) => {
          let text = para.textContent || '';
          // Add indentation for indented paragraphs (class "pi")
          if (para.classList.contains('pi')) {
            text = '  ' + text; // Add indentation
          }
          paras.push(text.trim());
        });
        return paras.join('\n\n');
      }
    }

    // Fallback: if we didn't find the expected structure or for other reading types
    // First, replace the specific Universalis div tags with newlines
    tempDiv.innerHTML = tempDiv.innerHTML.replace(
      /<div style="text-indent: -3em; margin-left: 3em;">/g,
      '\n',
    );
    // Now extract text content, which will preserve the inserted newlines
    let text = tempDiv.textContent || tempDiv.innerText || '';
    // Remove any remaining HTML tags and normalize spaces
    text = text
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  } catch (e) {
    console.error('Error parsing HTML content:', e);
    // Fallback: try basic replacement on original string if DOM parsing fails
    return htmlString
      .replace(/<br>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&lsquo;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .trim();
  }
}

/**
 * Gets daily mass readings using Universalis JSONP API.
 * Includes caching to reduce API calls.
 */
export const getDailyMassReadings = async (date: Date): Promise<LiturgicalReading[]> => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateString = `${year}${month}${day}`;

  // Check cache first
  const cacheKey = dateString;
  if (readingsCache[cacheKey]) {
    console.log(`Using cached readings for ${dateString}`);
    return readingsCache[cacheKey];
  }

  const callbackName = `universalisCallback_${dateString}_${Date.now()}`;
  const url = `https://universalis.com/${dateString}/jsonpmass.js?callback=${callbackName}`;

  console.log(`Fetching daily readings via JSONP: ${url}`);

  return new Promise((resolve, reject) => {
    let script: HTMLScriptElement | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let callbackDefined = false;

    // Cleanup function
    const cleanup = () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
        console.log(`Cleaned up script tag for ${callbackName}`);
      }
      if (callbackDefined) {
        try {
          delete (window as any)[callbackName];
        } catch (e) {
          /* ignore */
        }
        console.log(`Cleaned up window.${callbackName}`);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    // Define the callback function within the current scope
    const handleUniversalisData = (universalisData: any) => {
      console.log(`JSONP callback ${callbackName} executed. Received data:`, universalisData);
      try {
        const readings: LiturgicalReading[] = [];
        const addReading = (title: string, data: any) => {
          if (data && data.text && typeof data.text === 'string') {
            readings.push({
              title: title,
              citation: cleanHtmlContent(data.source || data.heading || title),
              content: cleanHtmlContent(data.text, title),
            });
          } else if (typeof data === 'string' && title === 'Gospel Acclamation') {
            readings.push({
              title: title,
              citation: title,
              content: cleanHtmlContent(data, title),
            });
          }
        };

        // Map known fields
        addReading('First Reading', universalisData.Mass_R1);
        addReading('Responsorial Psalm', universalisData.Mass_Ps);
        addReading('Second Reading', universalisData.Mass_R2);
        addReading('Gospel Acclamation', universalisData.Mass_GA || universalisData.Mass_Alleluia);
        addReading('Gospel', universalisData.Mass_G);

        console.log('Mapped readings:', readings);
        // Store in cache
        readingsCache[cacheKey] = readings;
        resolve(readings);
      } catch (mappingError) {
        console.error('Error mapping Universalis data:', mappingError);
        reject(new Error('Failed to process readings data from Universalis.'));
      } finally {
        cleanup();
      }
    };

    // Assign the locally defined function to the global scope
    if (!(window as any)[callbackName]) {
      (window as any)[callbackName] = handleUniversalisData;
      callbackDefined = true;
    } else {
      console.error(`Callback function ${callbackName} already exists on window.`);
      reject(new Error(`Callback function ${callbackName} conflict.`));
      return;
    }

    // Set a timeout
    timeoutId = setTimeout(() => {
      console.error(`JSONP request timed out for ${callbackName}`);
      reject(new Error('Request for daily readings timed out.'));
      cleanup();
    }, 10000);

    // Create and append the script tag
    script = document.createElement('script');
    script.src = url;
    script.onerror = (event) => {
      console.error(`Failed to load JSONP script: ${url}`, event);
      reject(new Error('Failed to load readings data script.'));
      cleanup();
    };
    document.body.appendChild(script);
    console.log(`Appended script tag for ${callbackName}`);
  });
};

/**
 * Gets liturgical events for the specified number of days ahead.
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
      console.log('Extracted content string from JSON response:', contentString);
      return extractAndParseJson(contentString, 'array');
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
        return extractAndParseJson(resultData.data, 'array');
      }
      throw new Error("AI response was not in the expected format and couldn't be processed.");
    }
  } catch (error: any) {
    console.error('Error fetching liturgical events via proxy:', error);
    let detail = error instanceof Error ? error.message : 'Unknown error';
    if (!error.code && error.details) {
      detail = `Error (${error.code}): ${error.details}`;
    } else if (error.code && error.message && !error.details) {
      detail = `Error (${error.code}): ${error.message}`;
    }
    throw new Error(`Could not fetch liturgical events: ${detail}`);
  }
};

/**
 * Gets saints and historical events for today's date.
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
      console.log('Extracted content string from JSON response:', contentString);
      // Extract and parse only the JSON object part
      return extractAndParseJson(contentString, 'object');
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
        return extractAndParseJson(resultData.data, 'object');
      }
      throw new Error("AI response was not in the expected format and couldn't be processed.");
    }
  } catch (error: any) {
    console.error('Error fetching saints/history via proxy:', error);
    let detail = error instanceof Error ? error.message : 'Unknown error';
    if (!error.code && error.details) {
      detail = `Error (${error.code}): ${error.details}`;
    } else if (error.code && error.message && !error.details) {
      detail = `Error (${error.code}): ${error.message}`;
    }
    throw new Error(`Could not fetch saints/history data: ${detail}`);
  }
};
