export interface MagisteriumMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Citation {
  cited_text: string;
  cited_text_heading?: string | null;
  document_title?: string | null;
  document_index: number;
  document_author?: string | null;
  document_year?: string | null;
  document_reference?: string | null;
  source_url?: string;
}

export interface MagisteriumResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  citations?: Citation[];
  related_questions?: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CloudFunctionRequestData {
  messages: MagisteriumMessage[];
  return_related_questions?: boolean;
  model?: string;
  stream?: boolean;
}

export interface MagisteriumProxyResponse {
  status: 'success' | 'error';
  responseType: 'json' | 'text' | 'markdown';
  data: {
    choices?: Array<{
      message: {
        content: string;
      };
    }>;
    [key: string]: any;
  };
}

// Define the expected structure of the Magisterium API's successful JSON response
export interface MagisteriumApiResponse {
  choices?: Array<{
    message?: {
      content?: string;
      role?: string;
    };
  }>;
}
