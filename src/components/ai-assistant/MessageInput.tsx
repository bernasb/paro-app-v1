import React, { useState, useEffect } from "react"; // Add useEffect
import { Mic, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoice } from "@/contexts/VoiceContext";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext"; // Import the auth hook

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
}

export const MessageInput = ({ onSendMessage, isProcessing }: MessageInputProps) => {
  const [input, setInput] = useState("");
  const { isListening, startListening } = useVoice();
  const { isAuthenticated, loading: authLoading } = useGoogleAuth(); // Get auth state

  // Determine if the input should be disabled
  const isDisabled = isProcessing || authLoading || !isAuthenticated;

  const handleSendMessage = () => {
    // Add an extra check here, although the disabled state should prevent this
    if (isDisabled || !input.trim()) {
      return;
    }
    onSendMessage(input);
    setInput("");
  };

  const toggleVoiceInput = () => {
    if (isDisabled) return; // Don't allow voice input if disabled
    startListening();
  };

  return (
    <div className="flex gap-2">
      <Button
        variant={isListening ? "default" : "outline"}
        size="icon"
        className={`flex-shrink-0 ${isListening ? "animate-pulse-light bg-clergy-primary" : ""}`}
        onClick={toggleVoiceInput}
        disabled={isDisabled} // Disable voice button too
      >
        <Mic className="h-4 w-4" />
      </Button>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          authLoading
            ? "Authenticating..."
            : !isAuthenticated
            ? "Please sign in to chat"
            : "Type your message..."
        } // Update placeholder based on auth state
        className="min-h-[80px]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        disabled={isDisabled} // Disable textarea based on combined state
      />
      <Button
        variant="default"
        size="icon"
        className="flex-shrink-0 bg-clergy-primary hover:bg-clergy-primary/90"
        onClick={handleSendMessage}
        disabled={!input.trim() || isDisabled} // Disable send button based on combined state
      >
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </div>
  );
};
