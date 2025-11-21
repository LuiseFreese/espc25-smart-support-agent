// Define shared types:
// - AgentContext: minimal context (conversationId, timestamp, maybe previous messages).
// - TriageResult: { type: 'FAQ' | 'RAG' | 'TICKET' | 'UNKNOWN'; reason?: string; category?: string; }
// - AgentResponse: { text: string; confidence?: number; meta?: Record<string, unknown>; }

export interface AgentContext {
    conversationId: string;
    timestamp: Date;
    previousMessages?: string[];
}

export type TriageType = 'FAQ' | 'RAG' | 'TICKET' | 'UNKNOWN';

export interface TriageResult {
    type: TriageType;
    reason?: string;
    category?: string;
    meta?: {
        usage?: {
            prompt: number;
            completion: number;
            total: number;
        };
        [key: string]: unknown;
    };
}

export interface AgentResponse {
    text: string;
    confidence?: number;
    meta?: {
        usage?: {
            prompt: number;
            completion: number;
            total: number;
        };
        [key: string]: unknown;
    };
}
