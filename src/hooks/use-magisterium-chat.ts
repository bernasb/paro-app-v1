import { useState, useEffect } from 'react';
import { useMagisteriumApi } from '@/hooks/use-magisterium-api';
import { Message } from '@/types/ai-assistant';
import { MagisteriumResponse } from '@/types/magisterium';

interface UseMagisteriumChatProps {
  initialMessage: Message;
}

const CHAT_SESSION_STORAGE_KEY = 'magisteriumChatSession';

// Helper remains the same
const loadMessagesFromSession = (initial: Message): Message[] => {
  console.log('Attempting to load messages from sessionStorage...');
  try {
    const storedMessages = sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    if (storedMessages) {
      const parsedMessages = JSON.parse(storedMessages);
      if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
        console.log('Parsed messages successfully.');
        return parsedMessages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp || Date.now()), // Ensure date object
          isLoading: false, // Ensure isLoading is false for stored messages
        }));
      }
    }
  } catch (error) {
    console.error('Error reading or parsing chat from sessionStorage:', error);
    sessionStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
  }
  console.log('No messages in session or error, returning initial message.');
  return [{ ...initial, isLoading: false }]; // Ensure initial message is not loading
};

export function useMagisteriumChat({ initialMessage }: UseMagisteriumChatProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    loadMessagesFromSession(initialMessage),
  );

  // Rename isLoading from useMagisteriumApi to avoid conflict
  const { isLoading: isApiProcessing, sendRequest } = useMagisteriumApi();

  // Session storage logic remains largely the same
  useEffect(() => {
    try {
      const messagesToSave = messages.filter((m) => !m.isLoading); // Don't save loading placeholders
      const shouldSave =
        messagesToSave.length > 1 ||
        (messagesToSave.length === 1 && messagesToSave[0].id !== initialMessage.id);
      if (shouldSave) {
        const messagesString = JSON.stringify(messagesToSave);
        sessionStorage.setItem(CHAT_SESSION_STORAGE_KEY, messagesString);
      } else {
        if (sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY)) {
          sessionStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('[SessionStorage Effect] Error saving chat to sessionStorage:', error);
    }
  }, [messages, initialMessage]);

  const clearChat = () => {
    console.log('Clearing chat and removing from sessionStorage.');
    setMessages([{ ...initialMessage, isLoading: false }]); // Reset with non-loading initial message
    sessionStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
    return true;
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return false;

    const userMessage: Message = {
      id: String(Date.now() + Math.random()),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      isLoading: false, // User messages are never loading
    };

    // Create a placeholder message
    const placeholderId = `placeholder_${Date.now()}`;
    const placeholderMessage: Message = {
      id: placeholderId,
      role: 'assistant',
      content: '...', // Placeholder content
      timestamp: new Date(),
      isLoading: true, // Mark as loading
    };

    const currentHistory = messages;

    // Update UI immediately with user message AND placeholder
    setMessages((prev) => [...prev, userMessage, placeholderMessage]);

    const apiMessagesToSend = [...currentHistory, userMessage]
      .filter(
        (msg) =>
          !msg.isLoading &&
          (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system'),
      )
      .map((msg) => ({ role: msg.role, content: msg.content }));

    if (apiMessagesToSend.length === 0) {
      console.error('Attempted to send empty message list to API. Aborting.');
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId && m.id !== userMessage.id)); // Remove user and placeholder
      return false;
    }

    let finalAssistantMessage: Message;
    let success = false;

    try {
      console.log('Sending messages via useMagisteriumApi hook:', apiMessagesToSend);
      const response: MagisteriumResponse | null = await sendRequest(apiMessagesToSend, true);
      console.log('Received response object in useMagisteriumChat:', response);

      // Check if we got a valid response
      if (!response) {
        console.error('Received null response from useMagisteriumApi hook');
        throw new Error('Failed to get a response from the AI service');
      }

      // Log the structure of the response to help debug
      console.log('Response structure:', {
        hasChoices: !!response?.choices,
        choicesLength: response?.choices?.length,
        firstChoice: response?.choices?.[0],
        hasMessage: !!response?.choices?.[0]?.message,
        messageContent: response?.choices?.[0]?.message?.content,
        citations: response?.citations,
        relatedQuestions: response?.related_questions,
      });

      // Extract the message content from the response
      const messageContent = response?.choices?.[0]?.message?.content;

      if (messageContent && typeof messageContent === 'string') {
        // Extract citations and related questions, defaulting to empty arrays if not present
        const citations = response?.citations ?? [];
        const relatedQuestions = response?.related_questions ?? [];

        finalAssistantMessage = {
          id: response.id || placeholderId, // Use real ID or placeholder ID
          role: 'assistant',
          content: messageContent,
          timestamp: new Date(
            (typeof response.created === 'number' ? response.created * 1000 : undefined) ??
              Date.now(),
          ),
          citations: citations,
          relatedQuestions: relatedQuestions,
          isLoading: false, // Mark as not loading
        };
        success = true;
      } else {
        console.error(
          'Received response lacked valid content at expected path (choices[0].message.content). Response:',
          response,
        );
        finalAssistantMessage = {
          id: placeholderId,
          role: 'assistant',
          content: "Sorry, I received a response but couldn't understand its format.",
          timestamp: new Date(),
          isLoading: false, // Mark error as not loading
        };
      }
    } catch (error) {
      console.error('Unexpected error in sendMessage after calling useMagisteriumApi:', error);
      finalAssistantMessage = {
        id: placeholderId,
        role: 'assistant',
        content: 'An unexpected error occurred while processing your request.',
        timestamp: new Date(),
        isLoading: false, // Mark error as not loading
      };
    }

    // Update the placeholder message with the final content or error
    setMessages((prev) =>
      prev.map((msg) => (msg.id === placeholderId ? finalAssistantMessage : msg)),
    );

    return success;
  };

  // Use the API processing state for the overall loading indicator if needed elsewhere
  // But individual message loading is handled by the placeholder system
  const isChatProcessing = messages.some((m) => m.isLoading);

  return {
    messages,
    // isProcessing: isApiProcessing, // Or potentially isChatProcessing if more accurate
    isProcessing: isChatProcessing || isApiProcessing, // Combine both maybe?
    sendMessage,
    clearChat,
  };
}
