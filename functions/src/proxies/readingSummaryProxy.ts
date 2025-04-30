import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { errorResponse, successResponse, requireAuth } from '../shared/utils';

// Import Magisterium SDK just like in dailyReadingsProxy
import Magisterium from 'magisterium';

// Using Secret Manager for API key access
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Secret name for the Magisterium API key in GCP Secret Manager
const MAGISTERIUM_API_KEY_SECRET = 'MAGISTERIUM_API_KEY';

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

/**
 * Initialize the Magisterium client with API key
 */
async function getMagisteriumClient() {
  try {
    const apiKey = await getSecret(MAGISTERIUM_API_KEY_SECRET);
    return new Magisterium({
      apiKey: apiKey,
    });
  } catch (error) {
    console.error('[readingSummaryProxy] Failed to initialize Magisterium client:', error);
    throw new Error('Could not initialize Magisterium client');
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
    
    // Get the Magisterium client
    const magisterium = await getMagisteriumClient();
    
    // Build a more explicit, detailed prompt
    const prompt = `In 5-7 detailed sentences, summarize the importance of ${title}${citation ? ` (${citation})` : ''} for understanding the Catholic faith and living it out in daily life. Please:\n- Explain the spiritual and practical significance for modern Catholics.\n- Include concrete examples or applications where possible.\n- At the end, provide 2-3 relevant references or citations from official Catholic sources (Magisterial documents, Catechism, or Church Fathers). For each reference, include: document title, author, year, a short cited text, and a source URL if available. Format citations as a JSON array under the heading 'References:' like this:\n\nReferences:\n[{"title": "...", "author": "...", "year": "...", "cited_text": "...", "url": "..."}]\nIf no references are available, say 'No references found.'`;
    
    // Call the Magisterium API
    const results = await magisterium.chat.completions.create({
      model: "magisterium-1",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    // Extract summary and citations
    const content = results.choices[0]?.message?.content || '';

    // Extract citations JSON if present
    let citations: any[] = [];
    const referencesMatch = content.match(/References:\s*\n(\[.*?\])/is);
    if (referencesMatch) {
      try {
        citations = JSON.parse(referencesMatch[1].trim());
      } catch (err) {
        citations = [];
      }
    }

    // Remove the references section from the summary
    const summaryText = content.replace(/References:\s*\n\[.*?\]/is, '').trim();

    // Package the response with summary and references
    const responseData = {
      summary: summaryText,
      detailedExplanation: summaryText,
      citations
    };
    
    return successResponse(responseData);
  } catch (error: any) {
    console.error('[readingSummaryProxy] Error:', error);
    return errorResponse(error.message || 'Failed to generate reading summary.');
  }
});
