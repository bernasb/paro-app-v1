import React, { useState, useEffect } from 'react'; // Add useEffect
import { Mic, SendHorizonal, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useVoice } from '@/contexts/VoiceContext';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext'; // Import the auth hook
import { useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  onVoiceQuery?: () => void;
  isListening?: boolean;
  preloadedQuestions?: string[];
}

export const MessageInput = ({ 
  onSendMessage, 
  isProcessing, 
  onVoiceQuery, 
  isListening: propIsListening, 
  preloadedQuestions = [] 
}: MessageInputProps) => {
  const [input, setInput] = useState('');
  const { isListening, startListening } = useVoice();
  const { isAuthenticated, loading: authLoading } = useGoogleAuth(); // Get auth state
  const location = useLocation();

  // Prefill input from query param if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefill = params.get('prefill');
    if (prefill) {
      setInput(prefill);
    }
  }, [location.search]);

  // Determine if the input should be disabled
  const isDisabled = isProcessing || authLoading || !isAuthenticated;

  const handleSendMessage = () => {
    // Add an extra check here, although the disabled state should prevent this
    if (isDisabled || !input.trim()) {
      return;
    }
    onSendMessage(input);
    setInput('');
  };

  const toggleVoiceInput = () => {
    if (isDisabled) return; // Don't allow voice input if disabled
    if (onVoiceQuery) {
      onVoiceQuery();
    } else {
      startListening();
    }
  };

  // Handle selecting a preloaded question
  const handleSelectQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Input area: mic | (textarea + send) */}
      <div className="flex gap-2 w-full">
        <Button
          variant={(propIsListening || isListening) ? 'default' : 'outline'}
          size="icon"
          className={`flex-shrink-0 ${(propIsListening || isListening) ? 'animate-pulse-light bg-clergy-primary' : ''}`}
          onClick={toggleVoiceInput}
          disabled={isDisabled} // Disable voice button too
        >
          <Mic className="h-4 w-4" />
        </Button>
        {/* Wrap textarea and ideas button in a column */}
        <div className="flex flex-col flex-1">
          <div className="flex w-full">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                authLoading
                  ? 'Authenticating...'
                  : !isAuthenticated
                    ? 'Please sign in to chat'
                    : 'Type your message...'
              } // Update placeholder based on auth state
              className="min-h-[80px] flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isDisabled} // Disable textarea based on combined state
            />
            <Button
              variant="default"
              size="icon"
              className="flex-shrink-0 bg-clergy-primary hover:bg-clergy-primary/90 ml-2"
              onClick={handleSendMessage}
              disabled={!input.trim() || isDisabled} // Disable send button based on combined state
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
          {/* Ideas dropdown button positioned below the input - only show if we have preloaded questions */}
          {preloadedQuestions.length > 0 && (
            <div className="mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors px-2 border border-sidebar-border"
                    disabled={isDisabled}
                  >
                    <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                    Need Ideas?
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                  {preloadedQuestions.map((question, index) => (
                    <DropdownMenuItem 
                      key={index} 
                      className="cursor-pointer"
                      onClick={() => handleSelectQuestion(question)}
                    >
                      {question}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
