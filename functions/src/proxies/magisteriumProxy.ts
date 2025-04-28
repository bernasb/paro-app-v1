// Ensure NO static import of magisterium is present
// import Magisterium from 'magisterium'; // <-- This should NOT exist!
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { errorResponse, successResponse, requireAuth } from '../shared/utils';
import axios from 'axios';

/**
 * magisteriumProxy - 2nd Gen Callable Function
 * Accepts: { messages: MagisteriumMessage[], return_related_questions?: boolean }
 * Returns: MagisteriumProxyResponse
 */
const magisteriumApiKey = defineSecret('MAGISTERIUM_API_KEY');

export const magisteriumProxy = onCall({ secrets: [magisteriumApiKey] }, async (request: CallableRequest<any>) => {
  console.log('[magisteriumProxy] Function triggered');
  console.log('[magisteriumProxy] Incoming request data:', JSON.stringify(request.data));
  try {
    requireAuth(request);

    const { messages, return_related_questions = false } = request.data;
    if (!messages || !Array.isArray(messages)) {
      console.log('[magisteriumProxy] Invalid or missing messages parameter:', messages);
      return errorResponse('Invalid request: messages array is required.');
    }

    const apiKey = magisteriumApiKey.value();
    if (!apiKey) {
      console.log('[magisteriumProxy] Magisterium API key is not configured');
      throw new HttpsError('internal', 'Magisterium API key is not configured');
    }

    // Use axios to make a direct HTTP request to the Magisterium API instead of the SDK
    const response = await axios.post(
      'https://www.magisterium.com/api/v1/chat/completions',
      {
        model: 'magisterium-1',
        messages,
        stream: false,
        return_related_questions
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[magisteriumProxy] Raw Magisterium API response:', JSON.stringify(response.data));
    const wrapped = successResponse(response.data);
    console.log('[magisteriumProxy] Wrapped response to client:', JSON.stringify(wrapped));
    return wrapped;
  } catch (error: any) {
    const message = error?.message || 'Failed to process Magisterium request.';
    console.error('[magisteriumProxy] Error occurred:', message, error);
    return errorResponse(message);
  }
});
