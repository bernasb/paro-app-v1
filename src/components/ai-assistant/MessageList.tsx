import { useRef, useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { Message } from '@/types/ai-assistant';

interface MessageListProps {
  messages: Message[];
  onRelatedQuestionClick: (question: string) => void;
}

export const MessageList = ({ messages, onRelatedQuestionClick }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto mb-4 space-y-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onRelatedQuestionClick={onRelatedQuestionClick}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
