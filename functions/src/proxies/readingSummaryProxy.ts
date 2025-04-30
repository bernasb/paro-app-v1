import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import axios from 'axios';
import { errorResponse, successResponse, requireAuth } from '../shared/utils';

// Replace with your actual Gemini API endpoint and key retrieval logic
const GEMINI_API_URL = 'https://your-gemini-api-endpoint-for-summary';

// Using Secret Manager for API key access same as dailyReadingsProxy
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Secret name for Google API key in GCP Secret Manager
const GOOGLE_API_KEY_SECRET = 'GOOGLE_API_KEY';

// Initialize Secret Manager client
const secretManagerClient = new SecretManagerServiceClient();

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
    console.error(`[readingSummaryProxy] Error retrieving secret ${secretName}:`, error);
    throw new Error(`Failed to retrieve secret ${secretName}`);
  }
}

export const readingSummaryProxy = onCall(async (request: CallableRequest<any>) => {
  requireAuth(request);
  const { title, citation = '' } = request.data; // Make citation optional with default empty string
  if (!title) {
    throw new HttpsError('invalid-argument', 'Missing "title" parameter');
  }
  try {
    console.log(`[readingSummaryProxy] Generating summary for: ${title} ${citation ? `(${citation})` : ''}`);
    
    // Get the API key from Secret Manager
    const apiKey = await getSecret(GOOGLE_API_KEY_SECRET);
    
    // Using Gemini API to generate a short summary
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        contents: [
          {
            role: "user",
            parts: [{
              text: `Generate a brief 1-2 sentence summary of what Catholics would hear in the following Bible reading at Mass: ${title} ${citation ? citation : ''}.\n\nKeep your summary concise, informative and focused on the key message. Format your response as plain text with no headings or labels.`
            }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 150
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        timeout: 15000
      }
    );
    
    // Extract the summary from Gemini response
    const summary = response.data.candidates[0]?.content?.parts[0]?.text || 
                    `Summary for ${title}${citation ? ` (${citation})` : ''}`;
    return successResponse({ summary });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to generate reading summary.');
  }
});
