"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingSummaryProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const utils_1 = require("../shared/utils");
// Replace with your actual Gemini API endpoint and key retrieval logic
const GEMINI_API_URL = 'https://your-gemini-api-endpoint-for-summary';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
exports.readingSummaryProxy = (0, https_1.onCall)(async (request) => {
    (0, utils_1.requireAuth)(request);
    const { title, citation } = request.data;
    if (!title || !citation) {
        throw new https_1.HttpsError('invalid-argument', 'Missing "title" or "citation" parameter');
    }
    try {
        // Replace with your actual logic to fetch summary
        // For now, return a mock
        const summary = `Summary for ${title} (${citation})`;
        return (0, utils_1.successResponse)({ summary });
    }
    catch (error) {
        return (0, utils_1.errorResponse)(error.message || 'Failed to generate reading summary.');
    }
});
