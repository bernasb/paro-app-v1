// Define the structure for a single citation (align with Message type)
export interface Citation {
  cited_text: string;
  cited_text_heading?: string | null; // Optional heading
  document_title?: string | null;
  document_index?: number; // Optional index
  document_author?: string | null;
  document_year?: string | null; // Optional year
  document_reference?: string | null;
  source_url?: string; // Optional source URL
}

export type Message = {
  id: number | string; // Allow string IDs for temporary placeholders
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Array<Citation>; // Use the detailed Citation interface
  relatedQuestions?: string[];
  isLoading?: boolean; // Add optional loading flag
};
