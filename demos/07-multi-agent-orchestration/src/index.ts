// Build a CLI demo for a simple multi-agent support system.
// Components:
// - TriageAgent: classify intent (question vs incident vs other).
// - FaqAgent: answer from a small in-memory FAQ map (exact QA).
// - RagAgent: call the same RAG pipeline as demo 02 (single query to Azure AI Search + LLM).
// - TicketAgent: call the ticket creation HTTP endpoint from demo 04/05 or simulate a ticket.
// - Orchestrator: decide which agent(s) to call and combine their results.
//
// Steps at runtime:
// 1. Read a user message from process.argv or stdin.
// 2. Call TriageAgent with the message; get back something like:
//      { type: 'FAQ' | 'RAG' | 'TICKET' | 'UNKNOWN', category?: string }
// 3. Based on type:
//    - 'FAQ': call FaqAgent; if it returns an answer with confidence < 0.8, fall back to RagAgent.
//    - 'RAG': call RagAgent directly.
//    - 'TICKET': call TicketAgent (and maybe also RagAgent to draft the ticket description).
//    - 'UNKNOWN': call RagAgent and, if still unsure, print "Escalate to human".
// 4. Print a summary of the decisions:
//    - which agents were called, in order
//    - their outputs
//    - the final message shown to the user.
// 5. Keep everything synchronous from the user's perspective (await all calls).
// 6. Add basic error handling and clear console logging so this works well in a live demo.

import * as dotenv from 'dotenv';
import { runTriage } from './agents/triageAgent';
import { runFaq } from './agents/faqAgent';
import { runRag } from './agents/ragAgent';
import { runTicket, updateTicketWithAIResponse } from './agents/ticketAgent';

dotenv.config();

/**
 * Orchestrator result returned to callers
 */
export interface OrchestratorResult {
    triage: {
        type: string;
        category?: string;
        reason: string;
    };
    agents: string[];
    finalResponse: string;
    ticketId?: string;
    confidence?: number;
    usage?: {
        prompt: number;
        completion: number;
        total: number;
    };
}

/**
 * Main orchestrator function - can be called from CLI or imported
 */
export async function runMultiAgentOrchestrator(userMessage: string): Promise<OrchestratorResult> {
    const agentsCalled: string[] = [];
    let finalResponse = '';
    let ticketId: string | undefined;
    let finalConfidence: number | undefined;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    // Step 1: Triage the request
    const triageResult = await runTriage(userMessage);
    agentsCalled.push('TriageAgent');
    
    // Aggregate triage tokens
    if (triageResult.meta?.usage) {
        totalPromptTokens += triageResult.meta.usage.prompt || 0;
        totalCompletionTokens += triageResult.meta.usage.completion || 0;
    }

    // Step 2: Route to appropriate agent(s)
    if (triageResult.type === 'FAQ') {
        const faqResponse = await runFaq(userMessage);
        agentsCalled.push('FaqAgent');

        if (faqResponse.confidence && faqResponse.confidence >= 0.8) {
            finalResponse = faqResponse.text;
            finalConfidence = faqResponse.confidence;
        } else {
            const ragResponse = await runRag(userMessage);
            agentsCalled.push('RagAgent');
            finalResponse = ragResponse.text;
            finalConfidence = ragResponse.confidence;
            
            // Aggregate RAG usage
            if (ragResponse.meta?.usage) {
                totalPromptTokens += ragResponse.meta.usage.prompt || 0;
                totalCompletionTokens += ragResponse.meta.usage.completion || 0;
            }
        }

    } else if (triageResult.type === 'RAG') {
        const ragResponse = await runRag(userMessage);
        agentsCalled.push('RagAgent');
        finalResponse = ragResponse.text;
        finalConfidence = ragResponse.confidence;
        
        // Aggregate RAG usage
        if (ragResponse.meta?.usage) {
            totalPromptTokens += ragResponse.meta.usage.prompt || 0;
            totalCompletionTokens += ragResponse.meta.usage.completion || 0;
        }

    } else if (triageResult.type === 'TICKET') {
        const ticketResponse = await runTicket(userMessage, triageResult.category);
        agentsCalled.push('TicketAgent');
        ticketId = ticketResponse.meta?.ticketId as string | undefined;

        // Also provide helpful info from RAG
        const ragResponse = await runRag(userMessage);
        agentsCalled.push('RagAgent');
        
        // Aggregate RAG usage
        if (ragResponse.meta?.usage) {
            totalPromptTokens += ragResponse.meta.usage.prompt || 0;
            totalCompletionTokens += ragResponse.meta.usage.completion || 0;
        }

        // Update ticket with AI response and confidence
        if (ticketId && !ticketResponse.meta?.simulated) {
            await updateTicketWithAIResponse(
                ticketId,
                ragResponse.text,
                ragResponse.confidence || 0
            );
        }

        finalResponse = `${ticketResponse.text}\n\nWhile you wait, here's some information that might help:\n${ragResponse.text}`;
        finalConfidence = ragResponse.confidence;

    } else {
        // UNKNOWN
        const ragResponse = await runRag(userMessage);
        agentsCalled.push('RagAgent');
        finalConfidence = ragResponse.confidence;
        
        // Aggregate RAG usage
        if (ragResponse.meta?.usage) {
            totalPromptTokens += ragResponse.meta.usage.prompt || 0;
            totalCompletionTokens += ragResponse.meta.usage.completion || 0;
        }

        if (ragResponse.confidence && ragResponse.confidence < 0.5) {
            finalResponse = `${ragResponse.text}\n\n⚠️  I'm not confident about this answer. Let me escalate this to a human support agent.`;
        } else {
            finalResponse = ragResponse.text;
        }
    }

    // Calculate total usage
    const totalUsage = totalPromptTokens + totalCompletionTokens;
    
    return {
        triage: {
            type: triageResult.type,
            category: triageResult.category,
            reason: triageResult.reason || 'No reason provided'
        },
        agents: agentsCalled,
        finalResponse,
        ticketId,
        confidence: finalConfidence,
        usage: totalUsage > 0 ? {
            prompt: totalPromptTokens,
            completion: totalCompletionTokens,
            total: totalUsage
        } : undefined
    };
}

/**
 * CLI entry point
 */
async function main() {
    // Get user message from command line
    const userMessage = process.argv.slice(2).join(' ');

    if (!userMessage) {
        console.error('Usage: npm run dev -- "<your question>"');
        console.error('Example: npm run dev -- "How do I reset my password?"');
        process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Multi-Agent Support System');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`💬 User: ${userMessage}\n`);

    try {
        console.log('🔍 Running orchestrator...\n');
        const result = await runMultiAgentOrchestrator(userMessage);

        // Display detailed console output for CLI
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Summary');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`Type: ${result.triage.type}`);
        console.log(`Reason: ${result.triage.reason}`);
        if (result.triage.category) {
            console.log(`Category: ${result.triage.category}`);
        }
        console.log(`Agents called: ${result.agents.join(' → ')}`);
        if (result.ticketId) {
            console.log(`Ticket ID: ${result.ticketId}`);
        }
        console.log(`\n🤖 Response:\n${result.finalResponse}`);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Error occurred:');
        console.error(error);
        process.exit(1);
    }
}

// Only run main() if this file is executed directly (not imported)
if (require.main === module) {
    main();
}
