// Export a function `runTriage(message: string): Promise<TriageResult>`.
// For now, implement a lightweight rule-based or OpenAI-based classifier:
// - If message contains words like "refund", "billing" -> type 'TICKET'.
// - If message looks like a short factual question and matches an FAQ key -> type 'FAQ'.
// - If message is long / open question -> type 'RAG'.
// - Else -> 'UNKNOWN'.
// Keep it simple and deterministic.

import { TriageResult } from './types';

export async function runTriage(message: string): Promise<TriageResult> {
    const lowerMessage = message.toLowerCase();

    // TICKET: Billing, refunds, complaints
    if (lowerMessage.match(/\b(refund|billing|charged?|invoice|payment|dispute|subscription)\b/)) {
        return {
            type: 'TICKET',
            category: 'Billing',
            reason: 'Billing-related keywords detected'
        };
    }

    // TICKET: Urgent issues
    if (lowerMessage.match(/\b(urgent|critical|down|emergency|asap)\b/)) {
        return {
            type: 'TICKET',
            category: 'Urgent',
            reason: 'Urgent priority keywords detected'
        };
    }

    // FAQ: Short factual questions
    if (message.length < 50 && lowerMessage.match(/\b(how do i|what is|where is|can i)\b/)) {
        return {
            type: 'FAQ',
            reason: 'Short factual question pattern'
        };
    }

    // RAG: Longer questions or troubleshooting
    if (message.length > 50 || lowerMessage.match(/\b(problem|issue|not working|keeps|error)\b/)) {
        return {
            type: 'RAG',
            reason: 'Complex question or troubleshooting scenario'
        };
    }

    // Default to UNKNOWN
    return {
        type: 'UNKNOWN',
        reason: 'No clear pattern matched'
    };
}
