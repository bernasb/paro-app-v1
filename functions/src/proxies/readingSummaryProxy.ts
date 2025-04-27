import * as functions from 'firebase-functions';
import axios from 'axios';
import { errorResponse, successResponse, requireAuth } from '../shared/utils';

// Replace with your actual Gemini API endpoint and key retrieval logic
const GEMINI_API_URL = 'https://your-gemini-api-endpoint-for-summary';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export const readingSummaryProxy = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  if (!data.title || !data.citation) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing "title" or "citation" parameter');
  }

  try {
    // Example: Call your Gemini API for reading summary
    const response = await axios.post(
      GEMINI_API_URL,
      { title: data.title, citation: data.citation },
      { headers: { 'Authorization': `Bearer ${GOOGLE_API_KEY}` } }
    );

    // Assume API returns { status: 'success', summary: ..., detailedExplanation: ... }
    return successResponse({
      summary: response.data.summary,
      detailedExplanation: response.data.detailedExplanation
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to generate reading summary.');
  }
});
