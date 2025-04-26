
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageList } from "@/components/ai-assistant/MessageList";
import { MessageInput } from "@/components/ai-assistant/MessageInput";
import { Message } from "@/types/ai-assistant";

interface ChatInterfaceProps {
  messages: Message[];
  isProcessing: boolean;
  onSendMessage: (message: string) => void;
  onRelatedQuestionClick: (question: string) => void;
  onVoiceQuery: () => void; // Added prop for starting voice query
  isListening: boolean; // Added prop for listening state
}

export function ChatInterface({
  messages,
  isProcessing,
  onSendMessage,
  onRelatedQuestionClick,
  onVoiceQuery, // Added to destructuring
  isListening, // Added to destructuring
}: ChatInterfaceProps) {
  return (
    <Card className="min-h-[600px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">Magisterium AI Assistant</CardTitle>
            <CardDescription className="text-lg">Ask theological questions and get AI-powered assistance</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <MessageList 
          messages={messages} 
          onRelatedQuestionClick={onRelatedQuestionClick} 
        />
        <MessageInput 
          onSendMessage={onSendMessage} 
          isProcessing={isProcessing} 
          onVoiceQuery={onVoiceQuery} // Pass prop down
          isListening={isListening} // Pass prop down
        />
      </CardContent>
    </Card>
  );
}
