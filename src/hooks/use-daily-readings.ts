import { useState, useEffect } from 'react';
import { useMagisteriumApi } from '@/hooks/use-magisterium-api';
// Only need these types now
import { LiturgicalReading, MagisteriumMessage } from '@/utils/magisterium/types';

// Re-use the cache from liturgicalService (consider moving cache to a shared location later)
const readingsCache: Record<string, LiturgicalReading[]> = {};

// Helper function to remove character counts from summaries
function removeCharacterCounts(text: string | undefined): string | undefined {
  if (!text) return text;
  // This regex matches various character count patterns:
  // - "(247 characters)" or "(123 character)" at the end of text
  // - "247 characters" at the end of text (without parentheses)
  // - Any variation with different spacing or capitalization
  return text.replace(/\s*[\(]?\d+\s+characters?[\)]?\s*$/i, '').trim();
}

// Clean all existing cache entries
Object.keys(readingsCache).forEach((key) => {
  if (readingsCache[key] && Array.isArray(readingsCache[key])) {
    readingsCache[key] = readingsCache[key].map((reading) => ({
      ...reading,
      summary: removeCharacterCounts(reading.summary),
    }));
  }
});

// Helper to extract JSON (copied from liturgicalService, consider refactoring to utils)
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
    return parsedData;
  } catch (parseError) {
    console.error(`Failed to parse extracted JSON ${expectedType}:`, parseError);
    console.error('Extracted substring that failed parsing:', jsonSubstring);
    const message = parseError instanceof Error ? parseError.message : 'Unknown parse error';
    throw new Error('Failed to parse extracted AI data: ' + message);
  }
}

export function useDailyReadings(date: Date | undefined) {
  const [readings, setReadings] = useState<LiturgicalReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: isApiLoading, sendRequest } = useMagisteriumApi(); // Use the authenticated API hook

  useEffect(() => {
    if (!date) {
      setReadings([]);
      setError('Please select a date.');
      return;
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const cacheKey = dateString;

    const fetchReadings = async () => {
      // Check cache first
      if (readingsCache[cacheKey]) {
        console.log(`Using cached readings for ${dateString}`);
        setReadings(readingsCache[cacheKey]);
        setError(null);
        return;
      }

      console.log(`Fetching daily readings via useMagisteriumApi for ${dateString}...`);
      setError(null); // Clear previous errors

      const messages: MagisteriumMessage[] = [
        {
          role: 'system',
          content: `You are a Catholic API endpoint that returns JSON. Respond ONLY with the valid JSON array requested. ABSOLUTELY NO introductory text, explanations, markdown formatting, character or word counts, or anything other than the JSON itself. Your entire response MUST start with '[' and end with ']'. Do not wrap the JSON in markdown code blocks. The JSON array should contain objects matching the LiturgicalReading interface: { title: string; citation: string; content: string; summary?: string; }. Ensure 'content' contains the full text of the reading and 'summary' is a concise 1-2 sentence overview. Include First Reading, Responsorial Psalm, Second Reading (if applicable), Gospel Acclamation. and Gospel.`,
        },
        {
          role: 'user',
          content: `
            Provide the Catholic Mass readings (First Reading, Responsorial Psalm, Second Reading (if present), Gospel Acclamation, and Gospel) for the date ${dateString}.
            For each reading, include:
            - title: The official title (e.g., "First Reading", "Responsorial Psalm", "Gospel Acclamation", "Gospel").
            - citation: The biblical reference (e.g., "Isaiah 55:10-11", "Psalm 34:4-7, 16-19", "Matthew 6:7-15").
            - summary: A Brief, plain language 3-4 sentence statement of the importance of each passage to the Catholic faith. NEVER INCLUDE CHARACTER COUNTS IN YOUR JSON OUTPUT.

            Format the entire response as a single, valid JSON array of objects, where each object represents one reading.
            Ensure the JSON is valid and contains only the array.
          `,
        },
      ];

      try {
        // Use sendRequest from useMagisteriumApi (assumes it handles auth)
        // The second argument 'true' likely indicates expecting JSON response
        // Let TypeScript infer the type from sendRequest's return value
        // sendRequest returns an object like { content: string, citations?: ..., relatedQuestions?: ... } or null
        const response = await sendRequest(messages, true);

        let parsedReadings: LiturgicalReading[];
        // Access the content string directly from the response
        const contentString = response?.content;

        if (contentString && typeof contentString === 'string') {
          // Attempt to parse the JSON string from the content
          parsedReadings = extractAndParseJson(contentString, 'array');
        } else {
          // Handle cases where the response is null or content is missing/invalid
          console.error('AI response content missing, invalid, or null:', response);
          // Throw error only if response wasn't explicitly null (which indicates sendRequest handled the error)
          if (response !== null) {
            throw new Error('Received invalid or missing content from AI.');
          } else {
            // If response is null, sendRequest already showed a toast, just return
            return;
          }
        }

        // Basic validation
        if (
          !Array.isArray(parsedReadings) ||
          parsedReadings.some((r) => !r.title || !r.citation || !r.content)
        ) {
          console.error('Parsed data is not a valid array of LiturgicalReading:', parsedReadings);
          throw new Error('Received invalid reading data structure from AI.');
        }

        // Clean up character counts from summaries
        const cleanedReadings = parsedReadings.map((reading) => ({
          ...reading,
          summary: removeCharacterCounts(reading.summary),
        }));

        console.log('Mapped readings from Magisterium via hook:', cleanedReadings);
        readingsCache[cacheKey] = cleanedReadings; // Update cache
        setReadings(cleanedReadings);
      } catch (err: unknown) {
        let errorMessage = 'Failed to fetch readings via API hook.';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        console.error('Error in useDailyReadings hook:', err);
        setError(errorMessage);
        setReadings([]); // Clear readings on error
      }
    };

    fetchReadings();
  }, [date, sendRequest]); // Add sendRequest to dependency array

  // Return loading state from useMagisteriumApi
  return { readings, loading: isApiLoading, error };
}
