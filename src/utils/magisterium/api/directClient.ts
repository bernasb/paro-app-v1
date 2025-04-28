import { MagisteriumMessage, MagisteriumResponse } from '../types';

/**
 * Function to send requests directly to the Magisterium API
 * This is a fallback if the proxy fails
 */
export const sendViaDirectClient = async (
  messages: MagisteriumMessage[],
  apiKey: string,
  returnRelatedQuestions: boolean = false,
): Promise<MagisteriumResponse> => {
  if (!apiKey) {
    throw new Error('API key is required for direct API calls to Magisterium');
  }

  console.log('Calling Magisterium API directly with provided API key');

  try {
    // Use the CORRECTED URL
    const response = await fetch('https://www.magisterium.com/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'magisterium-1',
        messages: messages,
        return_related_questions: returnRelatedQuestions || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Magisterium API direct error: ${response.status}`, errorText);
      throw new Error(`Magisterium API direct error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling Magisterium API directly:', error);
    // Re-throw the error so it can be caught by the main apiClient and potentially trigger the mock fallback
    throw error;
  }
};
