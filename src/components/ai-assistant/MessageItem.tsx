import { User, Bot, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types/ai-assistant';

interface MessageItemProps {
  message: Message;
  onRelatedQuestionClick: (question: string) => void;
}

export const MessageItem = ({ message, onRelatedQuestionClick }: MessageItemProps) => {
  // Clean the content: Use slightly more lenient regex to catch optional leading space
  const markdownComponents = {
    p: ({ node, ...props }) => <p className="text-sm whitespace-pre-wrap mb-2" {...props} />,
    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mb-3" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-lg font-medium mb-2" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-inside ml-4 mb-2" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-inside ml-4 mb-2" {...props} />,
    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
    a: ({ node, ...props }) => <a className="text-blue-500 hover:underline" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
    em: ({ node, ...props }) => <em className="italic" {...props} />,
    // Add more components here for other Markdown elements as needed (e.g., h1, h2, ul, li, etc.)
  };
  const cleanedContent =
    !message.isLoading && message.content
      ? message.content.replace(/\s?\[\^\d+\]/g, '').trim() // Regex updated here
      : message.content;

  return (
    <div className="space-y-2">
      <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        {/* Assistant Icon */}
        {message.role === 'assistant' && (
          <div className="w-8 h-8 rounded-full bg-clergy-primary flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`max-w-[60%] p-3 rounded-lg ${
            message.role === 'user' ? 'bg-clergy-primary text-primary-foreground' : 'bg-accent'
          }`}
        >
          {/* Display loading or cleaned content */}
          {message.isLoading ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Thinking...
            </div>
          ) : (
            <ReactMarkdown components={markdownComponents}>{cleanedContent}</ReactMarkdown>
          )}

          {/* Timestamp (hide if loading) */}
          {!message.isLoading && (
            <div className="text-xs opacity-70 mt-1">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        {/* User Icon */}
        {message.role === 'user' && (
          <div className="w-8 h-8 rounded-full bg-clergy-secondary flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Citations (only show if not loading) */}
      {!message.isLoading && message.citations && message.citations.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs">
              <BookOpen className="h-4 w-4 mr-2" />
              Citations
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CitationsDisplay citations={message.citations} />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Related Questions (only show if not loading) */}
      {!message.isLoading && message.relatedQuestions && message.relatedQuestions.length > 0 && (
        <RelatedQuestions
          questions={message.relatedQuestions}
          onQuestionClick={onRelatedQuestionClick}
        />
      )}
    </div>
  );
};

// --- CitationsDisplay and RelatedQuestions components remain the same ---
interface CitationsDisplayProps {
  citations: Message['citations'];
}

const CitationsDisplay = ({ citations }: CitationsDisplayProps) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-2 p-3 bg-muted rounded-md text-sm max-w-[60%]">
      <h4 className="font-semibold flex items-center gap-1 mb-2">
        <BookOpen className="h-4 w-4" />
        Citations
      </h4>
      <ul className="space-y-2">
        {citations.map((citation, index) => (
          <li key={index} className="text-xs">
            {citation.document_title && (
              <p className="font-medium">
                {citation.document_title}
                {citation.document_author && ` by ${citation.document_author}`}
                {citation.document_reference && ` (${citation.document_reference})`}
              </p>
            )}
            <p className="italic mt-1 text-muted-foreground">{citation.cited_text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface RelatedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

const RelatedQuestions = ({ questions, onQuestionClick }: RelatedQuestionsProps) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="ml-11 mt-2">
      <h4 className="text-sm font-semibold mb-2">Related Questions</h4>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onQuestionClick(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};
