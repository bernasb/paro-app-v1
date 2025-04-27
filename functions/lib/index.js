"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingSummaryProxy = exports.dailyReadingsProxy = exports.magisteriumProxy = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Replace with your actual logic to call Magisterium AI
async function getMagisteriumResponse(prompt) {
    // Example: Replace with actual API call logic
    // const response = await axios.post('https://magisterium.api/endpoint', { prompt });
    // return response.data;
    return {
        choices: [
            { text: 'Sample answer for: ' + prompt }
        ],
        citations: [],
        related_questions: []
    };
}
exports.magisteriumProxy = functions.https.onCall(async (data, context) => {
    if (!data.prompt) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing prompt');
    }
    // Optionally, check authentication:
    // if (!context.auth) {
    //   throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    // }
    const magisterium_response = await getMagisteriumResponse(data.prompt);
    return {
        status: "success",
        responseType: "json",
        data: magisterium_response
    };
});
var dailyReadingsProxy_1 = require("./dailyReadingsProxy");
Object.defineProperty(exports, "dailyReadingsProxy", { enumerable: true, get: function () { return dailyReadingsProxy_1.dailyReadingsProxy; } });
var readingSummaryProxy_1 = require("./readingSummaryProxy");
Object.defineProperty(exports, "readingSummaryProxy", { enumerable: true, get: function () { return readingSummaryProxy_1.readingSummaryProxy; } });
