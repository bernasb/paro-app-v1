export interface LiturgicalReading {
  title: string;
  citation: string;
  content: string;
  summary?: string; // Optional: Concise bullet-point summary
  detailedExplanation?: string; // Optional: Detailed markdown explanation
  summaryLoading?: boolean; // Optional: Loading state for summary
  summaryError?: string | null; // Optional: Error state for summary
  citations?: any[]; // Optional: Array of citation objects from Magisterium API
}

export interface LiturgicalEvent {
  date: string;
  name: string;
  description: string;
  color: string;
  importance: 'solemnity' | 'feast' | 'memorial' | 'optional memorial' | 'other';
}
