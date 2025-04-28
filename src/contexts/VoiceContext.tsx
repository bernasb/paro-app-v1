import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useToast } from '@/hooks/use-toast';

// Extend Window interface for experimental browser APIs
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface VoiceContextType {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  isWakeWordEnabled: boolean;
  toggleWakeWord: () => void;
  processVoiceCommand: (command: string) => void; // Function to process commands
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const WAKE_WORD = 'father'; // Example wake word

export const VoiceProvider = ({ children }: { children: ReactNode }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [backgroundRecognition, setBackgroundRecognition] = useState<SpeechRecognition | null>(
    null,
  );
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const { toast } = useToast();

  // Define the command processing logic (to be passed down or implemented here)
  const processVoiceCommand = useCallback(
    (command: string) => {
      console.log('Processing voice command:', command);
      // Example: Navigate based on command, trigger actions, etc.
      // This needs to be connected to the app's routing or action dispatching
      toast({ title: 'Voice Command (Demo)', description: `Command received: ${command}` });
    },
    [toast],
  );

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech Recognition API not supported in this browser.');
      setError('Speech Recognition API not supported in this browser.');
      return;
    }

    // --- Main Recognition Instance (for active listening) ---
    let recognitionInstance: SpeechRecognition | null = null;
    try {
      recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false; // Listen for a single utterance
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const currentTranscript = event.results[event.results.length - 1][0].transcript.trim();
        console.log('Main recognition result:', currentTranscript);
        setTranscript(currentTranscript);
        processVoiceCommand(currentTranscript.toLowerCase()); // Process the command
        setIsListening(false); // Stop listening after result
      };

      recognitionInstance.onerror = (event) => {
        console.error('Main Speech Recognition Error:', event.error);
        setError(`Recognition Error: ${event.error}`);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        console.log('Main recognition ended.');
        if (isListening) {
          // If it ended unexpectedly while supposed to be listening
          setIsListening(false);
          // Optionally restart background listening if wake word was enabled
          if (isWakeWordEnabled && backgroundRecognition) {
            try {
              backgroundRecognition.start();
            } catch (e) {
              console.error('Could not restart bg recognition on main end', e);
            }
          }
        }
      };
      setRecognition(recognitionInstance);
    } catch (initError) {
      console.error('Failed to initialize main SpeechRecognition:', initError);
      setError('Failed to initialize speech recognition service.');
      return; // Stop if main instance fails
    }

    // --- Background Recognition Instance (for wake word) ---
    let backgroundRecognitionInstance: SpeechRecognition | null = null;
    try {
      backgroundRecognitionInstance = new SpeechRecognition();
      backgroundRecognitionInstance.continuous = true; // Keep listening in the background
      backgroundRecognitionInstance.interimResults = true; // Get results as they come
      backgroundRecognitionInstance.lang = 'en-US';

      backgroundRecognitionInstance.onresult = (event) => {
        // Find the latest transcript segment
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const segment = event.results[i];
          if (segment.isFinal) {
            // Process final segments for wake word
            const segmentText = segment[0].transcript.trim().toLowerCase();
            console.log('Background final segment:', segmentText);
            if (segmentText.includes(WAKE_WORD)) {
              console.log('Wake word detected!');
              stopListening(); // Stop background listening
              startListening(); // Start main listening
              // Optionally provide feedback
              toast({ title: 'Wake Word Detected', description: 'Listening for your command...' });
              break; // Stop processing further segments
            }
          }
        }
      };

      backgroundRecognitionInstance.onerror = (event) => {
        // Background errors are often less critical (e.g., no-speech timeout)
        console.warn('Background Speech Recognition Error:', event.error);
        // Avoid setting a persistent error for background noise/timeouts
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Background Recognition Error: ${event.error}`);
        }
      };

      backgroundRecognitionInstance.onend = () => {
        console.log('Background recognition ended.');
        // Restart background recognition if wake word detection is still enabled
        if (isWakeWordEnabled) {
          console.log('Attempting to restart background recognition...');
          try {
            // Ensure instance exists before starting
            if (backgroundRecognitionInstance) {
              backgroundRecognitionInstance.start();
              console.log('Background recognition restarted.');
            } else {
              console.warn('Background instance missing, cannot restart.');
            }
          } catch (error) {
            console.error('Could not restart background recognition:', error);
            // Avoid continuous restart loops on persistent errors
            setIsWakeWordEnabled(false);
            setError('Failed to restart background listening. Disabled wake word.');
          }
        }
      };
      setBackgroundRecognition(backgroundRecognitionInstance);

      // Initially start background recognition if wake word is enabled by default (example)
      // if (isWakeWordEnabled) { // Or load initial state from storage
      //     try { backgroundRecognitionInstance.start(); } catch(e) { console.error("Could not start initial bg recog", e); }
      // }
    } catch (initError) {
      console.error('Failed to initialize background SpeechRecognition:', initError);
      // Don't set persistent error, maybe wake word just won't work
      toast({
        title: 'Wake Word Feature Unavailable',
        description: 'Could not initialize background listening.',
        variant: 'destructive',
      });
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up SpeechRecognition instances.');
      try {
        if (recognitionInstance) {
          recognitionInstance.abort();
        }
      } catch (e) {
        console.error('Error aborting main recognition:', e);
      }
      try {
        if (backgroundRecognitionInstance) {
          backgroundRecognitionInstance.abort();
        }
      } catch (e) {
        console.error('Error aborting background recognition:', e);
      }
    };
  }, []); // Empty dependency array - run once on mount

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      try {
        // Stop background listening if it's running
        if (backgroundRecognition) {
          try {
            backgroundRecognition.stop();
          } catch (e) {
            console.warn('Error stopping bg recog before main start', e);
          }
        }
        console.log('Starting main recognition...');
        setTranscript(''); // Clear previous transcript
        setError(null); // Clear previous errors
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting main recognition:', error);
        setError('Could not start listening.');
        setIsListening(false);
      }
    }
  }, [recognition, isListening, backgroundRecognition]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      try {
        console.log('Stopping main recognition...');
        recognition.stop();
      } catch (error) {
        console.error('Error stopping main recognition:', error);
        // State will be set to false in onend handler
      }
    }
    // Also ensure background is stopped if wake word is disabled
    if (!isWakeWordEnabled && backgroundRecognition) {
      try {
        backgroundRecognition.stop();
      } catch (e) {
        console.warn('Error stopping bg recog on manual stop', e);
      }
    }
    setIsListening(false); // Ensure state is false
  }, [recognition, isListening, backgroundRecognition, isWakeWordEnabled]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const toggleWakeWord = useCallback(() => {
    setIsWakeWordEnabled((prev) => {
      const newState = !prev;
      if (newState) {
        // Start background listening if enabling
        if (backgroundRecognition) {
          try {
            console.log('Starting background recognition due to toggle.');
            backgroundRecognition.start();
          } catch (e) {
            console.error('Failed to start background recognition on toggle', e);
            toast({
              title: 'Error',
              description: 'Could not enable wake word listening.',
              variant: 'destructive',
            });
            return false; // Revert state if start fails
          }
        } else {
          toast({
            title: 'Error',
            description: 'Background listening service not available.',
            variant: 'destructive',
          });
          return false; // Revert state if service unavailable
        }
      } else {
        // Stop background listening if disabling
        if (backgroundRecognition) {
          try {
            console.log('Stopping background recognition due to toggle.');
            backgroundRecognition.stop();
          } catch (e) {
            console.warn('Error stopping background recognition on toggle', e);
          }
        }
      }
      return newState;
    });
  }, [backgroundRecognition, toast]);

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        clearTranscript,
        isWakeWordEnabled,
        toggleWakeWord,
        processVoiceCommand, // Provide the processing function
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
