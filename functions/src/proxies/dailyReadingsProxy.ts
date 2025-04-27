import * as functions from 'firebase-functions';
import axios from 'axios';
import { errorResponse, successResponse, requireAuth } from '../shared/utils';

// Replace with your actual Gemini API endpoint and key retrieval logic
const GEMINI_API_URL = 'https://your-gemini-api-endpoint';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export const dailyReadingsProxy = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  // Validate input
  if (!data.date) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing "date" parameter');
  }

  try {
    // Example: Call your Gemini API for daily readings
    const response = await axios.post(
      GEMINI_API_URL,
      { date: data.date },
      { headers: { 'Authorization': `Bearer ${GOOGLE_API_KEY}` } }
    );

    // Assume API returns { status: 'success', data: [...] }
    return successResponse(response.data.data);
  } catch (error: any) {
    // Handle errors and wrap in expected structure
    return errorResponse(error.message || 'Failed to fetch daily readings.');
  }
});
