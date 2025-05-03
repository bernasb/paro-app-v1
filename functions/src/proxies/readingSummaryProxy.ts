import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { errorResponse, successResponse, requireAuth } from '../shared/utils';
import fetch from 'node-fetch';

// Using Secret Manager for API key access
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Secret name for the Magisterium API key in GCP Secret Manager
const MAGISTERIUM_API_KEY_SECRET = 'MAGISTERIUM_API_KEY';

// Magisterium REST API endpoint for completions
const MAGISTERIUM_API_URL = 'https://www.magisterium.com/api/v1/chat/completions';

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

  // 1. Get API key
  let apiKey: string;
  try {
    apiKey = await getSecret(MAGISTERIUM_API_KEY_SECRET);
  } catch (err) {
    console.error('[readingSummaryProxy] Could not get API key:', err);
    throw new HttpsError('internal', 'Could not retrieve Magisterium API key.');
  }

// 3. Build REST API request body
const body = {
  model: 'magisterium-1',
  messages: [
    {
      role: 'user',
      // Use backticks (`) for the template literal
      content: `Summarize ONLY the following Catholic liturgical reading (do NOT include 
  or add summaries of other readings from the same day).

  - For any First through Sixth readings, Canticles, or Epistles encountered (which will vary
  through the liturgical year), compose one short and brief paragraph explaining how the 
  reading provides context and background for understanding God's plan of salvation throughout history, what 
  the practical faith takeaway message is for Catholics, and how Catholics can practice, 
  consider or apply its message in daily life.  Limit your entire explanation to one 
  paragraph, but use enough detail to provide a clear and concise summary.

  - For any Psalm encountered, provide a sentence describing the key theme and the 
  spiritual attitude Catholics need to consider when reading the Psalm.

  - For any Gospel or alternative Gospel, compose one short, comprehensive paragraph explaining 
  key themes, theological insights, and context for better knowing what Jesus said and did, and 
  how this Gospel impacts our Catholic daily life in how we live and further commit to 
  following Christ. Limit your entire explanation to one paragraph, but use enough detail 
  to provide a clear and concise summary.

  - Do not include any introductory or summary statement(s) before your output. 

  - Each bullet point, if used (but not necessary) should be on its own line, starting with a bullet (•). 

  - Summarize ALL readings, including Psalms.

  - Use citations in the format [n] (not [^n]) and provide a references section with full citation details.

  - Provide the document IDs or titles for the references used in your previous response and include 
  them in the citations array with the full citation details.

  - Respond ONLY with a valid JSON object, containing a "summary" field with the summary text, 
  a "detailedExplanation" field with any additional explanation, and a "citations" field with 
  an array of citation objects.

Title: ${title}
Citation: ${citation}`
    }
  ],
  max_tokens: 256,
  temperature: 0.5,
  stream: false,
  return_related_questions: true
};

  // 4. Call Magisterium REST API directly
  let magisteriumResponseRaw: any;
  let rawText = '';
  try {
    console.log('[readingSummaryProxy] Sending request to Magisterium API:', JSON.stringify(body));
    const response = await fetch(MAGISTERIUM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    rawText = await response.text();
    console.log('[readingSummaryProxy] Magisterium raw response (text):', rawText);
    try {
      magisteriumResponseRaw = JSON.parse(rawText);
      console.log('[readingSummaryProxy] Parsed response:', JSON.stringify({
        choices: magisteriumResponseRaw?.choices,
        content: magisteriumResponseRaw?.choices?.[0]?.message?.content,
        citations: magisteriumResponseRaw?.citations?.length
      }));
    } catch (e) {
      console.error('[readingSummaryProxy] Failed to parse response as JSON:', e);
      magisteriumResponseRaw = null;
    }
  } catch (err) {
    console.error('[readingSummaryProxy] Magisterium REST API call failed:', err);
    throw new HttpsError('internal', 'Failed to call Magisterium API.');
  }

  // 5. Parse the response (match Magisterium API expectations)
  let summary = '';
  let detailedExplanation = '';
  let citations: any[] = [];
  let summaryError: string | undefined = undefined;
  try {
    let content = '';
    if (magisteriumResponseRaw) {
      content = magisteriumResponseRaw?.choices?.[0]?.message?.content || '';
      citations = magisteriumResponseRaw?.citations || [];
    } else {
      content = rawText;
      citations = [];
    }
    
    // Try to parse the content as JSON to extract summary and detailedExplanation
    try {
      // First remove any code block formatting
      const cleanedContent = content.replace(/^```json\s*|```\s*$/g, '');
      const parsedContent = JSON.parse(cleanedContent);
      
      // Extract the fields
      summary = parsedContent.summary || '';
      detailedExplanation = parsedContent.detailedExplanation || '';
      
      // Check if there are citations in the parsed content
      if (parsedContent.citations && Array.isArray(parsedContent.citations)) {
        citations = parsedContent.citations;
      }
      
      console.log('[readingSummaryProxy] Successfully parsed JSON content:', { 
        summaryLength: summary.length,
        detailedExplanationLength: detailedExplanation?.length || 0
      });
    } catch (jsonError) {
      console.warn('[readingSummaryProxy] Could not parse as JSON:', jsonError);
      // If parsing fails, use the raw content as the summary
      summary = content;
    }
  } catch (err) {
    console.error('[readingSummaryProxy] Error parsing Magisterium response:', err);
    summary = rawText;
    citations = [];
  }

  if (!summary || summary.trim() === '') {
    summaryError = 'No summary was generated for this reading. Please try again later or check the API prompt/response.';
    console.warn('[readingSummaryProxy] No summary extracted for:', { title, citation, rawText });
  }

  return successResponse({ summary, detailedExplanation, citations, summaryError });
});
