import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
// Import the correct function from the updated service file
import { proxyMagisteriumRequest } from '@/utils/magisterium/proxyService';
import { MagisteriumMessage } from '@/types/magisterium';

/**
 * A hook for making Magisterium API requests using the Firebase Cloud Function proxy.
 */
export function useMagisteriumApi() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Update the return type to match what proxyMagisteriumRequest returns
  const sendRequest = async (
    messages: MagisteriumMessage[],
    returnRelatedQuestions: boolean = false,
  ) => {
    setIsLoading(true);

    try {
      console.log('Sending request to Magisterium API via Firebase Cloud Function proxy');

      // Call the correct proxy function with the correct arguments
      const response = await proxyMagisteriumRequest(messages, returnRelatedQuestions);

      // Assuming proxyMagisteriumRequest returns the defined structure or null on error
      return response;
    } catch (error) {
      // Errors from the Cloud Function call (like network issues or explicit throws)
      // might be caught here if proxyMagisteriumRequest re-throws them.
      // Errors returned *within* the response object (e.g., if content indicates an error)
      // were handled inside proxyMagisteriumRequest.
      console.error('Error invoking Magisterium proxy function:', error);

      let errorMessage = 'Failed to connect to Magisterium AI. Please try again later.';

      if (error instanceof Error) {
        // Handle potential HttpsError details from Firebase
        const firebaseError = error as any; // Use any for potential code/details access
        if (firebaseError.code && firebaseError.details) {
          errorMessage = `Error (${firebaseError.code}): ${firebaseError.details?.message || firebaseError.message}`;
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: 'Connection Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    sendRequest,
  };
}
