"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingSummaryProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const utils_1 = require("../shared/utils");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Using Secret Manager for API key access
const secret_manager_1 = require("@google-cloud/secret-manager");
// Secret name for the Magisterium API key in GCP Secret Manager
const MAGISTERIUM_API_KEY_SECRET = 'MAGISTERIUM_API_KEY';
// Magisterium REST API endpoint for completions
const MAGISTERIUM_API_URL = 'https://www.magisterium.com/api/v1/chat/completions';
// Initialize Secret Manager client
const secretManagerClient = new secret_manager_1.SecretManagerServiceClient();
/**
 * Get a secret from GCP Secret Manager
 * @param secretName Name of the secret to retrieve
 * @returns The secret value
 */
async function getSecret(secretName) {
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
    }
    catch (error) {
        console.error(`[readingSummaryProxy] Error retrieving secret ${secretName}:`, error);
        throw new Error(`Failed to retrieve secret ${secretName}`);
    }
}
exports.readingSummaryProxy = (0, https_1.onCall)(async (request) => {
    (0, utils_1.requireAuth)(request);
    const { title, citation = '' } = request.data; // Make citation optional with default empty string
    // 1. Get API key
    let apiKey;
    try {
        apiKey = await getSecret(MAGISTERIUM_API_KEY_SECRET);
    }
    catch (err) {
        console.error('[readingSummaryProxy] Could not get API key:', err);
        throw new https_1.HttpsError('internal', 'Could not retrieve Magisterium API key.');
    }
    // 3. Build REST API request body (as in Python, but match Magisterium API expectations)
    const body = {
        model: 'magisterium-1',
        messages: [
            {
                role: 'user',
                content: `Summarize ONLY the following liturgical reading (do NOT include summaries of other readings from the same day). If this is a Psalm, provide a summary in 3-5 bullet points or short sentences, including key themes and the spiritual attitude or response encouraged by the Psalm. For other readings, provide 5-7 bullet points or short, clear sentences (using a list if appropriate), including key themes, theological insights, and context. Do not include any introductory or summary statement before the bullet points. Each bullet point should be on its own line, starting with a bullet (•). Use citations in the format [^n] and provide a references section with full citation details. Summarize ALL readings, including Psalms.\n\nTitle: ${title}\nCitation: ${citation}`
            }
        ],
        max_tokens: 512,
        temperature: 0.7,
        stream: false,
        return_related_questions: false
    };
    // 4. Call Magisterium REST API directly
    let magisteriumResponseRaw;
    let rawText = '';
    try {
        console.log('[readingSummaryProxy] Sending request to Magisterium API:', JSON.stringify(body));
        const response = await (0, node_fetch_1.default)(MAGISTERIUM_API_URL, {
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
        }
        catch (e) {
            console.error('[readingSummaryProxy] Failed to parse response as JSON:', e);
            magisteriumResponseRaw = null;
        }
    }
    catch (err) {
        console.error('[readingSummaryProxy] Magisterium REST API call failed:', err);
        throw new https_1.HttpsError('internal', 'Failed to call Magisterium API.');
    }
    // 5. Parse the response (match Magisterium API expectations)
    let summary = '';
    let citations = [];
    let summaryError = undefined;
    try {
        let content = '';
        if (magisteriumResponseRaw) {
            content = magisteriumResponseRaw?.choices?.[0]?.message?.content || '';
            citations = magisteriumResponseRaw?.citations || [];
        }
        else {
            content = rawText;
            citations = [];
        }
        summary = content;
    }
    catch (err) {
        console.error('[readingSummaryProxy] Error parsing Magisterium response:', err);
        summary = rawText;
        citations = [];
    }
    if (!summary || summary.trim() === '') {
        summaryError = 'No summary was generated for this reading. Please try again later or check the API prompt/response.';
        console.warn('[readingSummaryProxy] No summary extracted for:', { title, citation, rawText });
    }
    return (0, utils_1.successResponse)({ summary, citations, summaryError });
});
