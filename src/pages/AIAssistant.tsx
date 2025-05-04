import { useState, useEffect } from 'react';
import { Trash2, Save, Edit, Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/ai-assistant';
import { ChatInterface } from '@/components/ai-assistant/ChatInterface';
// Removed CapabilitiesCard import as it's no longer used here
// import { CapabilitiesCard } from "@/components/ai-assistant/CapabilitiesCard";
import { useMagisteriumChat } from '@/hooks/use-magisterium-chat';
import { useVoice } from '@/contexts/VoiceContext';
import { useToast } from '@/components/ui/use-toast';
import { getStoredQuestions, saveQuestionsToStorage, defaultQuestions } from '@/config/preloadedQuestions';
import { Input } from '@/components/ui/input';

const AIAssistant = () => {
  const { toast } = useToast();

  // State for preloaded questions
  const [preloadedQuestions, setPreloadedQuestions] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');

  // Load questions from localStorage or use defaults
  useEffect(() => {
    setPreloadedQuestions(getStoredQuestions());
  }, []);

  // Save questions to localStorage when they change (only while in edit mode)
  useEffect(() => {
    if (isEditMode) {
      saveQuestionsToStorage(preloadedQuestions);
    }
  }, [preloadedQuestions, isEditMode]);

  const initialMessage: Message = {
    id: 1,
    role: 'assistant',
    content: 'Alleluia! This is the day the Lord has made. How may I assist you today?',
    timestamp: new Date(),
  };

  const { messages, isProcessing, sendMessage, clearChat } = useMagisteriumChat({ initialMessage });

  const { startListening, isListening, error: voiceError } = useVoice();

  useEffect(() => {
    if (voiceError) {
      toast({
        title: 'Voice Recognition Error',
        description: voiceError,
        variant: 'destructive',
      });
    }
  }, [voiceError, toast]);

  // Function to handle saving the chat via browser download
  const saveChat = () => {
    if (messages.length <= 1) {
      toast({
        title: 'Cannot Save Empty Chat',
        description: 'There are no messages to save yet.',
        variant: 'destructive',
      });
      return;
    }

    const newline = String.fromCharCode(10);

    const chatContent = messages
      .map((msg) => `[${msg.timestamp.toISOString()}] ${msg.role}: ${msg.content}`)
      .join(newline);

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
        title: 'Chat Download Initiated',
        description: `Your browser will prompt you to save ${fileName}.`,
      });
    } catch (error) {
      console.error('Failed to initiate chat download:', error);
      toast({
        title: 'Error Saving Chat',
        description: 'Could not prepare the chat history for download.',
        variant: 'destructive',
      });
    }
  };

  const handleRelatedQuestionClick = (question: string) => {
    sendMessage(question);
  };

  // Question template management functions
  const addQuestion = () => {
    if (newQuestion.trim()) {
      setPreloadedQuestions([...preloadedQuestions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const updateQuestion = (index: number, value: string) => {
    const updatedQuestions = [...preloadedQuestions];
    updatedQuestions[index] = value;
    setPreloadedQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    setPreloadedQuestions(preloadedQuestions.filter((_, i) => i !== index));
  };

  const resetToDefaults = () => {
    setPreloadedQuestions([...defaultQuestions]);
    toast({
      title: 'Reset Complete',
      description: 'Question templates have been reset to defaults.',
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6 h-full animate-fade-in">
      {/* Sticky Header with Blur Padding Above/Below - MATCHED TO MASS READINGS */}
      <div className="sticky top-0 z-30">
        {/* Blur above header */}
        <div className="absolute left-0 right-0 -top-6 h-6 bg-background/80 backdrop-blur-md pointer-events-none" />
        {/* Header container */}
        <div className="relative flex flex-row items-center justify-between mb-4 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-border pb-2 px-2">
          <h1 className="text-2xl font-bold flex items-center">
            AI Assistant
          </h1>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={resetToDefaults} aria-label="Reset to defaults">
                  Reset Templates
                </Button>
                <Button variant="secondary" onClick={() => setIsEditMode(false)} aria-label="Done editing">
                  <Check className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={saveChat} aria-label="Save chat">
                  <Save className="h-4 w-4 mr-2" />
                  Save Chat
                </Button>
                <Button variant="outline" onClick={clearChat} aria-label="Clear chat">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Chat
                </Button>
                <Button variant="outline" onClick={() => setIsEditMode(true)} aria-label="Edit templates">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Templates
                </Button>
              </>
            )}
          </div>
        </div>
        {/* Blur below header */}
        <div className="absolute left-0 right-0 -bottom-6 h-6 bg-background/80 backdrop-blur-md pointer-events-none" />
      </div>

      {/* Question Template Editor (only shown in edit mode) */}
      {isEditMode && (
        <div className="bg-muted/40 rounded-lg p-4 space-y-4 mb-4">
          <h2 className="text-lg font-medium">Edit Question Templates</h2>
          <p className="text-sm text-muted-foreground">These questions will appear as suggestions for users to click and customize.</p>
          
          <div className="space-y-2">
            {preloadedQuestions.map((question, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input 
                  value={question} 
                  onChange={(e) => updateQuestion(index, e.target.value)} 
                  className="flex-1"
                />
                <Button 
                  variant="destructive" 
                  size="icon" 
                  onClick={() => removeQuestion(index)}
                  aria-label="Remove question"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Input 
              value={newQuestion} 
              onChange={(e) => setNewQuestion(e.target.value)} 
              placeholder="Add new question template..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newQuestion.trim()) {
                  addQuestion();
                }
              }}
            />
            <Button 
              variant="secondary" 
              onClick={addQuestion}
              disabled={!newQuestion.trim()}
              aria-label="Add question"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Main chat area scrolls independently under sticky header */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ChatInterface
          messages={messages}
          isProcessing={isProcessing}
          onSendMessage={sendMessage}
          onRelatedQuestionClick={handleRelatedQuestionClick}
          onVoiceQuery={startListening}
          isListening={isListening}
          preloadedQuestions={preloadedQuestions}
        />
      </div>
    </div>
  );
};

export default AIAssistant;
