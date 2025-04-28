import { MagisteriumMessage, MagisteriumResponse } from '../types';

/**
 * This is the direct client for Magisterium API
 * In real-world usage, this would likely encounter CORS issues
 * and should not be used in production.
 */
export const sendViaDirectClient = async (
  messages: MagisteriumMessage[],
  apiKey: string,
  returnRelatedQuestions: boolean = false,
): Promise<MagisteriumResponse> => {
  if (!apiKey) {
    throw new Error('API key is required for direct Magisterium API access');
  }

  try {
    const response = await fetch('https://api.magisterium.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'magisterium-1',
        messages: messages,
        return_related_questions: returnRelatedQuestions,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Magisterium API error:', errorData);
      throw new Error(`Magisterium API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in direct Magisterium client:', error);
    throw error;
  }
};
