"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyReadingsProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const utils_1 = require("../shared/utils");
// Replace with your actual Gemini API endpoint and key retrieval logic
const GEMINI_API_URL = 'https://your-gemini-api-endpoint';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
exports.dailyReadingsProxy = (0, https_1.onCall)(async (request) => {
    (0, utils_1.requireAuth)(request);
    const { date } = request.data;
    if (!date) {
        throw new https_1.HttpsError('invalid-argument', 'Missing "date" parameter');
    }
    try {
        // Replace with your actual logic to fetch readings
        // For now, return a mock
        const readings = [{ date, reading: 'Sample Reading' }];
        return (0, utils_1.successResponse)({ readings });
    }
    catch (error) {
        return (0, utils_1.errorResponse)(error.message || 'Failed to fetch daily readings.');
    }
});
