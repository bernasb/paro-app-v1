import { MagisteriumMessage, MagisteriumResponse } from './types';
import { sendViaDirectClient } from './api/directClient';
// Removed Firebase imports for httpsCallable
// import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
// import app from '@/integrations/firebase/client'; // Use default import for Firebase app

// --- Types copied from Firebase Function for clarity ---
// Define the structure for a single citation (matching backend definition)
interface Citation {
  cited_text: string;
  cited_text_heading?: string | null;
  document_title?: string | null;
  document_index: number;
  document_author?: string | null;
  document_year?: string | null;
  document_reference?: string | null;
  source_url?: string;
}

// Define the structure of the response from the Magisterium API
interface MagisteriumApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    citations?: Citation[];
    related_questions?: string[];
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: Citation[]; // Citations might be top-level too
  related_questions?: string[]; // Related questions might be top-level too
}

// Define the data structure expected by the cloud function
interface RequestData {
  messages: MagisteriumMessage[]; // Use MagisteriumMessage type here
  return_related_questions: boolean;
}

// Define the structure returned BY the cloud function
interface ActualCloudFunctionResponse {
  status: 'success' | 'error';
  responseType: 'json' | 'text' | 'error';
  data: MagisteriumApiResponse | string; // The nested payload or error message
}

// Define the structure of the response BODY from the Python HTTP function
// It wraps the ActualCloudFunctionResponse structure inside a 'data' field
interface PythonProxyResponse {
  data: ActualCloudFunctionResponse;
}

// --- End of copied types ---

// Define the URL for the Python magisteriumProxy function
// Replace with your actual project ID and region if different
const magisteriumProxyUrl =
  'https://us-central1-clergy-connect-idx-ver.cloudfunctions.net/magisteriumProxy';

// Main function to send requests to Magisterium API with fallback mechanisms
export const sendMagisteriumRequest = async (
  messages: MagisteriumMessage[],
  apiKey: string = '', // Default to empty string to use server-side key
  returnRelatedQuestions: boolean = false,
): Promise<MagisteriumResponse> => {
  // First, try the Python HTTP Cloud Function proxy
  try {
    console.log(
      'Using Python HTTP Cloud Function proxy (magisteriumProxy) with server-side API key',
    );

    const response = await fetch(magisteriumProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Send data directly in body
        messages: messages,
        return_related_questions: returnRelatedQuestions,
      }),
    });

    if (!response.ok) {
      // Attempt to read error details if available, otherwise use status text
      let errorDetails = `HTTP error! Status: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        // Check for the nested error structure: { data: { status: 'error', responseType: 'error', data: '...' } }
        if (errorBody?.data?.data) {
          errorDetails = String(errorBody.data.data);
        } else if (errorBody?.error) {
          // Handle potential top-level error
          errorDetails = String(errorBody.error);
        }
      } catch (parseError) {
        // Ignore if error response is not JSON
      }
      throw new Error(errorDetails);
    }

    // Parse the JSON response which should contain { data: { status: ..., responseType: ..., data: ... } }
    const resultBody = (await response.json()) as PythonProxyResponse;

    // Handle the wrapped response structure from the Python function
    if (resultBody.data?.status === 'success' && resultBody.data?.responseType === 'json') {
      // Assuming MagisteriumResponse is compatible with the nested 'data.data' field
      return resultBody.data.data as MagisteriumResponse;
    } else {
      // Throw an error if the function reported an error or unexpected format
      const errorMessage =
        typeof resultBody.data?.data === 'string'
          ? resultBody.data.data
          : 'Python proxy function returned an error or unexpected format';
      console.error('Error response from Python proxy function:', resultBody.data);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error calling Python magisteriumProxy function:', error);

    // If direct client should be attempted and API key is provided
    if (apiKey) {
      try {
        console.log('Proxy failed, attempting direct client with provided API key');
        return await sendViaDirectClient(messages, apiKey, returnRelatedQuestions);
      } catch (directError) {
        console.error('Direct client also failed:', directError);
      }
    }

    // If all real API connections fail, throw an error
    console.error('All connection methods failed for Magisterium API.');
    throw new Error('Failed to connect to Magisterium API via proxy and direct client.');
  }
};
