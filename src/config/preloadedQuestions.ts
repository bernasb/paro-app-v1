// Default preloaded questions for the AI Assistant

export const defaultQuestions = [
  "Can you explain today's Gospel reading?",
  "What is the significance of today's feast day?",
  "How do I pray the Rosary?",
  "Can you explain the Liturgy of the Hours?",
  "What are the Seven Sacraments?",
  "How can I better understand today's homily?",
  "Explain today's reading in historical context",
  "What saints are celebrated today?",
];

// Local storage key for saved questions
export const STORAGE_KEY = 'paro-app-preloaded-questions';

// Helper function to get questions from storage or defaults
export const getStoredQuestions = (): string[] => {
  try {
    const storedQuestions = localStorage.getItem(STORAGE_KEY);
    if (storedQuestions) {
      return JSON.parse(storedQuestions);
    }
  } catch (error) {
    console.error('Error loading preloaded questions from storage:', error);
  }
  return [...defaultQuestions]; // Return a copy of the default questions
};

// Helper function to save questions to local storage
export const saveQuestionsToStorage = (questions: string[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch (error) {
    console.error('Error saving preloaded questions to storage:', error);
  }
};
