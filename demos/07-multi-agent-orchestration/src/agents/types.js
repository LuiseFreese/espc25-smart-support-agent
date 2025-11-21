// Define shared types:
// - AgentContext: minimal context (conversationId, timestamp, maybe previous messages).
// - TriageResult: { type: 'FAQ' | 'RAG' | 'TICKET' | 'UNKNOWN'; reason?: string; category?: string; }
// - AgentResponse: { text: string; confidence?: number; meta?: Record<string, unknown>; }
export {};
