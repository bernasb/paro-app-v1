import { getFunctions, httpsCallable, HttpsCallableResult } from "firebase/functions";
import { 
  MagisteriumMessage, 
  CloudFunctionRequestData, 
  MagisteriumProxyResponse,
  MagisteriumApiResponse 
} from '@/types/magisterium';
import { SaintOfTheDay, HistoricalEvent, SaintsAndHistoryResult } from '@/types/saints';

// Helper function to call the proxy
async function callMagisteriumProxy(messages: MagisteriumMessage[]): Promise<MagisteriumProxyResponse> {
    const functions = getFunctions();
    const callable = httpsCallable<
        CloudFunctionRequestData,
        MagisteriumProxyResponse
    >(functions, 'magisteriumProxy');

    const result: HttpsCallableResult<MagisteriumProxyResponse> = await callable({
        messages: messages,
        return_related_questions: false
    });

    if (result.data?.status !== 'success' || !result.data?.data) {
        console.error("Cloud function call failed or returned no nested data payload:", result.data);
        throw new Error("Failed to get a valid data payload from the proxy function.");
    }

    if (result.data.responseType !== 'json') {
        console.error("Proxy function returned non-JSON data, but JSON was expected:", result.data);
        throw new Error(`Expected JSON data from proxy, but received ${result.data.responseType}.`);
    }

    return result.data;
}

/**
 * Gets saint of the day and historical events by calling the Magisterium AI via the proxy.
 */
export const getSaintsAndHistory = async (): Promise<SaintsAndHistoryResult> => {
  console.log("Fetching saints & history via Cloud Function proxy...");
  const today = new Date();
  const month = today.getMonth() + 1; // JavaScript months are 0-indexed
  const day = today.getDate();

  const messages: MagisteriumMessage[] = [
    {
      role: "system",
      content: "You are a Catholic historian. Respond ONLY with the JSON data requested, without any introductory text or explanations.",
    },
    {
      role: "user",
      content: `
        Provide information for today's date (${month}/${day}):
        1. The primary saint(s) commemorated or feast celebrated today.
        2. A few important historical events in Church history that occurred on this date (any year).

        Format the entire response as a single JSON object with two keys:
        - "saintOfTheDay": An object containing details of the main saint/feast (keys: "name", "feastType" [e.g., Memorial, Feast, Solemnity], "description", "bornYear", "deathYear"). If multiple major saints share the day, pick the most prominent or list them briefly in the description. If it's a Sunday or major feast overriding a saint, describe the feast. If no specific saint is commemorated (e.g., Feria), make saintOfTheDay null.
        - "historicalEvents": An array of objects, each representing a historical event (keys: "year", "event", "description"). Include 2-4 notable events. If no notable events are found, make historicalEvents an empty array.

        Ensure the JSON is valid.
      `
    }
  ];

  try {
    const resultData = await callMagisteriumProxy(messages);
    const aiResponse = resultData.data as MagisteriumApiResponse;
    const contentJson = aiResponse?.choices?.[0]?.message?.content;

    if (!contentJson || typeof contentJson !== 'string') {
        console.error("AI response content is missing, not a string, or in unexpected format within the 'data' field:", aiResponse);
        throw new Error("AI response content is missing or malformed.");
    }

    console.log("Attempting to parse AI content string:", contentJson);

    try {
      const parsedResult: SaintsAndHistoryResult = JSON.parse(contentJson);

      if (typeof parsedResult !== 'object' || parsedResult === null) {
        console.error("Parsed saints/history content is not an object:", parsedResult);
        throw new Error("AI response format error (expected object after parsing).");
      }

      console.log("Successfully parsed saints/history content:", parsedResult);
      return parsedResult;

    } catch (parseError: unknown) {
      console.error("Failed to parse JSON content string for saints/history:", parseError);
      console.error("Raw content string received for saints/history:", contentJson);
      let message = (parseError instanceof Error) ? parseError.message : "Unknown parse error";
      throw new Error(`Failed to parse saints/history data: ${message}`);
    }

  } catch (error: any) {
    console.error("Error fetching saints/history:", error);
    let detail = (error instanceof Error) ? error.message : "Unknown error";
    if (error.code && error.message) {
        detail = `Error (${error.code}): ${error.message}`;
    }
    const finalMessage = error.message.startsWith("Failed to parse") || error.message.startsWith("AI response content is missing") || error.message.startsWith("Expected JSON data") || error.message.startsWith("Failed to get a valid data payload")
        ? error.message
        : `Could not fetch saints/history data: ${detail}`;
    throw new Error(finalMessage);
  }
};
