import { Mic, MicOff, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoice } from '@/contexts/VoiceContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function VoiceCommandButton() {
  const {
    isListening,
    // isProcessing, // isProcessing seems unused here, maybe remove?
    startListening,
    stopListening,
    isWakeWordEnabled,
    toggleWakeWord, // Correct function name from context
  } = useVoice();

  const toggleVoiceCommand = () => {
    // Use startListening/stopListening directly from context
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const ButtonIcon = isListening ? MicOff : Mic;
  const buttonText = isListening ? 'Stop Listening' : 'Voice Command';
  const buttonVariant: 'default' | 'outline' | 'destructive' = isListening ? 'default' : 'outline';
  const additionalClasses = isListening ? 'animate-pulse-light bg-clergy-primary' : '';

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isWakeWordEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={toggleWakeWord} // Call the correct function
              className={`${isWakeWordEnabled ? 'bg-clergy-primary' : ''}`}
            >
              <Radio size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isWakeWordEnabled ? "Wake word 'paro' enabled" : "Enable wake word 'paro'"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        variant={buttonVariant}
        onClick={toggleVoiceCommand}
        className={cn('gap-2', additionalClasses)}
        // disabled={isProcessing} // Consider if this is needed based on context changes
      >
        <ButtonIcon size={18} />
        <span>{buttonText}</span>
      </Button>
    </div>
  );
}

// Import cn helper function from utils
// Assuming cn is defined elsewhere or imported properly in the actual project
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: unknown[]) {
  return twMerge(clsx(inputs));
}
