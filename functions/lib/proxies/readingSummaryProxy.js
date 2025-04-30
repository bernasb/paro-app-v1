"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingSummaryProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("../shared/utils");
// Replace with your actual Gemini API endpoint and key retrieval logic
const GEMINI_API_URL = 'https://your-gemini-api-endpoint-for-summary';
// Using Secret Manager for API key access same as dailyReadingsProxy
const secret_manager_1 = require("@google-cloud/secret-manager");
// Secret name for Google API key in GCP Secret Manager
const GOOGLE_API_KEY_SECRET = 'GOOGLE_API_KEY';
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
    if (!title) {
        throw new https_1.HttpsError('invalid-argument', 'Missing "title" parameter');
    }
    try {
        console.log(`[readingSummaryProxy] Generating summary for: ${title} ${citation ? `(${citation})` : ''}`);
        // Get the API key from Secret Manager
        const apiKey = await getSecret(GOOGLE_API_KEY_SECRET);
        // Using Gemini API to generate a short summary
        const response = await axios_1.default.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
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
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            timeout: 15000
        });
        // Extract the summary from Gemini response
        const summary = response.data.candidates[0]?.content?.parts[0]?.text ||
            `Summary for ${title}${citation ? ` (${citation})` : ''}`;
        return (0, utils_1.successResponse)({ summary });
    }
    catch (error) {
        return (0, utils_1.errorResponse)(error.message || 'Failed to generate reading summary.');
    }
});
