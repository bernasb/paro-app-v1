"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.magisteriumProxy = void 0;
// Ensure NO static import of magisterium is present
// import Magisterium from 'magisterium'; // <-- This should NOT exist!
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const utils_1 = require("../shared/utils");
const axios_1 = __importDefault(require("axios"));
/**
 * magisteriumProxy - 2nd Gen Callable Function
 * Accepts: { messages: MagisteriumMessage[], return_related_questions?: boolean }
 * Returns: MagisteriumProxyResponse
 */
const magisteriumApiKey = (0, params_1.defineSecret)('MAGISTERIUM_API_KEY');
exports.magisteriumProxy = (0, https_1.onCall)({ secrets: [magisteriumApiKey] }, async (request) => {
    console.log('[magisteriumProxy] Function triggered');
    console.log('[magisteriumProxy] Incoming request data:', JSON.stringify(request.data));
    try {
        (0, utils_1.requireAuth)(request);
        const { messages, return_related_questions = false } = request.data;
        if (!messages || !Array.isArray(messages)) {
            console.log('[magisteriumProxy] Invalid or missing messages parameter:', messages);
            return (0, utils_1.errorResponse)('Invalid request: messages array is required.');
        }
        const apiKey = magisteriumApiKey.value();
        if (!apiKey) {
            console.log('[magisteriumProxy] Magisterium API key is not configured');
            throw new https_1.HttpsError('internal', 'Magisterium API key is not configured');
        }
        // Use axios to make a direct HTTP request to the Magisterium API instead of the SDK
        const response = await axios_1.default.post('https://www.magisterium.com/api/v1/chat/completions', {
            model: 'magisterium-1',
            messages,
            stream: false,
            return_related_questions
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('[magisteriumProxy] Raw Magisterium API response:', JSON.stringify(response.data));
        const wrapped = (0, utils_1.successResponse)(response.data);
        console.log('[magisteriumProxy] Wrapped response to client:', JSON.stringify(wrapped));
        return wrapped;
    }
    catch (error) {
        const message = error?.message || 'Failed to process Magisterium request.';
        console.error('[magisteriumProxy] Error occurred:', message, error);
        return (0, utils_1.errorResponse)(message);
    }
});
