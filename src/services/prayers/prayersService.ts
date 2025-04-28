import { MagisteriumMessage } from '@/types/magisterium';
import { CatholicPrayer } from '@/types/prayers';
import { sendMagisteriumRequest } from '@/utils/magisterium/apiClient';
import { parseJsonFromResponse } from '@/utils/magisterium/helpers';

// Function to get Catholic prayers
export const getCatholicPrayers = async (apiKey: string = ''): Promise<CatholicPrayer[]> => {
  const prayers = [
    "Apostle's Creed",
    'Nicene Creed',
    'St. Michael Prayer',
    'The Way of the Cross',
    'The Rosary',
    'Stations of the Cross',
    'Novena to the Sacred Heart of Jesus',
    'Novena and Consecration to the Immaculate Heart of Mary',
    'Novena to St. Joseph',
    'The Angelus',
    'Chaplet of Divine Mercy',
    'The Regina Caeli',
  ];

  const messages: MagisteriumMessage[] = [
    {
      role: 'system',
      content:
        'You are a Catholic prayer resource. Provide the text of common Catholic prayers in a structured format.',
    },
    {
      role: 'user',
      content: `Provide the full text of these Catholic prayers: ${prayers.join(', ')}. Format as JSON with an array of objects having title, content, and optionally description properties.`,
    },
  ];

  try {
    const response = await sendMagisteriumRequest(messages, apiKey);

    // Get content from the first choice's message
    const responseContent = response.choices[0]?.message?.content || '';

    // Try to extract JSON from the response
    const prayerList = parseJsonFromResponse(responseContent, '[]');

    if (prayerList && Array.isArray(prayerList)) {
      return prayerList;
    }

    // Fallback
    return [];
  } catch (error) {
    console.error('Error fetching Catholic prayers:', error);
    return [];
  }
};
