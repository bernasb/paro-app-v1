// Types for Liturgical Functions
export interface LiturgicalReading {
  title: string;
  citation: string;
  content: string;
  summary?: string;
  summaryLoading?: boolean;
  summaryError?: string;
}

export interface ReadingSummaryResponse {
  summary: string;
  detailedExplanation?: string;
}

export interface MagisteriumMessage {
  role: string;
  content: string;
}

export interface MagisteriumProxyResponse {
  status: string;
  data: any;
  responseType?: string;
}
