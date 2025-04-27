import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { errorResponse, successResponse, requireAuth } from './shared/utils';
import { MagisteriumMessage, MagisteriumProxyResponse } from './shared/types';

admin.initializeApp();

/**
 * Magisterium Proxy Callable Function
 * Accepts: { messages: MagisteriumMessage[], return_related_questions?: boolean }
 * Returns: MagisteriumProxyResponse
 */
export const magisteriumProxy = functions.https.onCall(async (data, context) => {
  try {
    requireAuth(context);
    if (!data.messages || !Array.isArray(data.messages)) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid "messages" array');
    }
    // Replace the following with your actual Magisterium AI API endpoint and key
    const MAGISTERIUM_API_URL = process.env.MAGISTERIUM_API_URL || '';
    const MAGISTERIUM_API_KEY = process.env.MAGISTERIUM_API_KEY || '';
    const payload = {
      messages: data.messages,
      return_related_questions: data.return_related_questions || false
    };
    const response = await axios.post(
      MAGISTERIUM_API_URL,
      payload,
      { headers: { 'Authorization': `Bearer ${MAGISTERIUM_API_KEY}` } }
    );
    return successResponse(response.data);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to process Magisterium request.');
  }
});

export { dailyReadingsProxy } from './proxies/dailyReadingsProxy';
export { readingSummaryProxy } from './proxies/readingSummaryProxy';
