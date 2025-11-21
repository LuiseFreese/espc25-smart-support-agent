import * as dotenv from 'dotenv';
import { runTriage } from './agents/triageAgent';
import { runFaq } from './agents/faqAgent';
import { runRag } from './agents/ragAgent';
import { runTicket, updateTicketWithAIResponse } from './agents/ticketAgent';
dotenv.config();
/**
 * Main orchestrator function - can be called from CLI or imported
 */
export async function runMultiAgentOrchestrator(userMessage) {
    const agentsCalled = [];
    let finalResponse = '';
    let ticketId;
    let finalConfidence;
    // Step 1: Triage the request
    const triageResult = await runTriage(userMessage);
    agentsCalled.push('TriageAgent');
    // Step 2: Route to appropriate agent(s)
    if (triageResult.type === 'FAQ') {
        const faqResponse = await runFaq(userMessage);
        agentsCalled.push('FaqAgent');
        if (faqResponse.confidence && faqResponse.confidence >= 0.8) {
            finalResponse = faqResponse.text;
            finalConfidence = faqResponse.confidence;
        }
        else {
            const ragResponse = await runRag(userMessage);
            agentsCalled.push('RagAgent');
            finalResponse = ragResponse.text;
            finalConfidence = ragResponse.confidence;
        }
    }
    else if (triageResult.type === 'RAG') {
        const ragResponse = await runRag(userMessage);
        agentsCalled.push('RagAgent');
        finalResponse = ragResponse.text;
        finalConfidence = ragResponse.confidence;
    }
    else if (triageResult.type === 'TICKET') {
        const ticketResponse = await runTicket(userMessage, triageResult.category);
        agentsCalled.push('TicketAgent');
        ticketId = ticketResponse.meta?.ticketId;
        // Also provide helpful info from RAG
        const ragResponse = await runRag(userMessage);
        agentsCalled.push('RagAgent');
        // Update ticket with AI response and confidence
        if (ticketId && !ticketResponse.meta?.simulated) {
            await updateTicketWithAIResponse(ticketId, ragResponse.text, ragResponse.confidence || 0);
        }
        finalResponse = `${ticketResponse.text}\n\nWhile you wait, here's some information that might help:\n${ragResponse.text}`;
        finalConfidence = ragResponse.confidence;
    }
    else {
        // UNKNOWN
        const ragResponse = await runRag(userMessage);
        agentsCalled.push('RagAgent');
        finalConfidence = ragResponse.confidence;
        if (ragResponse.confidence && ragResponse.confidence < 0.5) {
            finalResponse = `${ragResponse.text}\n\n⚠️  I'm not confident about this answer. Let me escalate this to a human support agent.`;
        }
        else {
            finalResponse = ragResponse.text;
        }
    }
    return {
        triage: {
            type: triageResult.type,
            category: triageResult.category,
            reason: triageResult.reason || 'No reason provided'
        },
        agents: agentsCalled,
        finalResponse,
        ticketId,
        confidence: finalConfidence
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
    }
    catch (error) {
        console.error('\n❌ Error occurred:');
        console.error(error);
        process.exit(1);
    }
}
main();
