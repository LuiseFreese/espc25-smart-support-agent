export interface TriageResult {
  category: string;
  priority: string;
}

export interface RAGResult {
  answer: string;
  confidence: number;
  sources?: string[];
}

export interface SupportTicket {
  Title: string;
  Description?: string;  // Optional field for ticket details
  Status: string;
  Priority: string;
  Category: string;
  CustomerEmail: string;
  AIResponse: string;
  TicketID: string;
  Confidence: number;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  body: {
    content: string;
    contentType: string;
  };
  receivedDateTime: string;
}
