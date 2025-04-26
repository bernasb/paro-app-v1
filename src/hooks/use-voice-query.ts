
import { useEffect } from "react";

export function useVoiceQuery(onQuery: (query: string) => void, deps: any[] = []) {
  useEffect(() => {
    const handleVoiceQuery = (event: CustomEvent) => {
      const query = event.detail.query;
      if (query && typeof query === 'string') {
        // Auto-send the message after a short delay
        setTimeout(() => {
          onQuery(query);
        }, 500);
      }
    };

    window.addEventListener('voiceQueryReceived', handleVoiceQuery as EventListener);
    
    return () => {
      window.removeEventListener('voiceQueryReceived', handleVoiceQuery as EventListener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);
}
