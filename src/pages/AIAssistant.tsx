import { useState, useEffect } from "react";
import { Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "@/types/ai-assistant";
import { ChatInterface } from "@/components/ai-assistant/ChatInterface";
// Removed CapabilitiesCard import as it's no longer used here
// import { CapabilitiesCard } from "@/components/ai-assistant/CapabilitiesCard"; 
import { useMagisteriumChat } from "@/hooks/use-magisterium-chat";
import { useVoice } from "@/contexts/VoiceContext";
import { useToast } from "@/components/ui/use-toast";

const AIAssistant = () => {
  const { toast } = useToast();

  const initialMessage: Message = {
    id: 1,
    role: "assistant",
    content: "Alleluia! This is the day the Lord has made. How may I assist you today?",
    timestamp: new Date(),
  };

  const { 
    messages, 
    isProcessing, 
    sendMessage, 
    clearChat, 
  } = useMagisteriumChat({ initialMessage });

  const { startListening, isListening, error: voiceError } = useVoice(); 

  useEffect(() => {
      if (voiceError) {
          toast({
              title: "Voice Recognition Error",
              description: voiceError,
              variant: "destructive",
          });
      }
  }, [voiceError, toast]);

  // Function to handle saving the chat via browser download
  const saveChat = () => {
    if (messages.length <= 1) {
        toast({
            title: "Cannot Save Empty Chat",
            description: "There are no messages to save yet.",
            variant: "destructive",
        });
        return;
    }

    const newline = String.fromCharCode(10); 

    const chatContent = messages.map(msg => 
      `[${msg.timestamp.toISOString()}] ${msg.role}: ${msg.content}`
    ).join(newline);
    
    const fileName = `chat_history_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    
    try {
      const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);

      toast({
        title: "Chat Download Initiated",
        description: `Your browser will prompt you to save ${fileName}.`,
      });

    } catch (error) {
      console.error("Failed to initiate chat download:", error);
      toast({
        title: "Error Saving Chat",
        description: "Could not prepare the chat history for download.",
        variant: "destructive",
      });
    }
  };

  const handleRelatedQuestionClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 px-4 pt-4 md:px-6 md:pt-6">
        <h1 className="text-2xl font-semibold">AI Assistant</h1>
        <div className="flex space-x-2">
          {/* Save Chat Button with Text */}
          <Button variant="outline" onClick={saveChat} aria-label="Save chat">
            <Save className="h-4 w-4 mr-2" />
            Save Chat
          </Button>
          {/* Clear Chat Button with Text */}
          <Button variant="outline" onClick={clearChat} aria-label="Clear chat">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat
          </Button>
        </div>
      </div>
      {/* Removed conditional rendering - Always show ChatInterface */}
      <ChatInterface
        messages={messages}
        isProcessing={isProcessing}
        onSendMessage={sendMessage}
        onRelatedQuestionClick={handleRelatedQuestionClick}
        onVoiceQuery={startListening}
        isListening={isListening}
      />
    </div>
  );
};

export default AIAssistant;
