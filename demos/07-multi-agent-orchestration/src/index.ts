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

    const agentsCalled: string[] = [];
    let finalResponse = '';

    try {
        // Step 1: Triage the request
        console.log('🔍 Step 1: Triaging request...');
        const triageResult = await runTriage(userMessage);
        agentsCalled.push('TriageAgent');
        console.log(`   Type: ${triageResult.type}`);
        console.log(`   Reason: ${triageResult.reason}`);
        if (triageResult.category) {
            console.log(`   Category: ${triageResult.category}`);
        }
        console.log();

        // Step 2: Route to appropriate agent(s)
        if (triageResult.type === 'FAQ') {
            console.log('📚 Step 2: Checking FAQ...');
            const faqResponse = await runFaq(userMessage);
            agentsCalled.push('FaqAgent');

            if (faqResponse.confidence && faqResponse.confidence >= 0.8) {
                console.log(`   ✅ Found FAQ match (confidence: ${faqResponse.confidence})`);
                finalResponse = faqResponse.text;
            } else {
                console.log('   ⚠️  No FAQ match, falling back to RAG...\n');
                console.log('🔎 Step 3: Searching knowledge base...');
                const ragResponse = await runRag(userMessage);
                agentsCalled.push('RagAgent');
                console.log(`   Confidence: ${ragResponse.confidence?.toFixed(2)}`);
                finalResponse = ragResponse.text;
            }

        } else if (triageResult.type === 'RAG') {
            console.log('🔎 Step 2: Searching knowledge base...');
            const ragResponse = await runRag(userMessage);
            agentsCalled.push('RagAgent');
            console.log(`   Confidence: ${ragResponse.confidence?.toFixed(2)}`);
            console.log(`   Passages found: ${ragResponse.meta?.passagesFound || 0}`);
            finalResponse = ragResponse.text;

        } else if (triageResult.type === 'TICKET') {
            console.log('🎫 Step 2: Creating support ticket...');
            const ticketResponse = await runTicket(userMessage, triageResult.category);
            agentsCalled.push('TicketAgent');
            console.log(`   Ticket ID: ${ticketResponse.meta?.ticketId}`);

            // Also provide helpful info from RAG if available
            console.log('\n🔎 Step 3: Searching for related information...');
            const ragResponse = await runRag(userMessage);
            agentsCalled.push('RagAgent');

            // Update ticket with AI response and confidence
            if (ticketResponse.meta?.ticketId && !ticketResponse.meta?.simulated) {
                await updateTicketWithAIResponse(
                    String(ticketResponse.meta.ticketId),
                    ragResponse.text,
                    ragResponse.confidence || 0
                );
            }

            finalResponse = `${ticketResponse.text}\n\nWhile you wait, here's some information that might help:\n${ragResponse.text}`;

        } else {
            // UNKNOWN
            console.log('❓ Step 2: Unknown request type, trying RAG...');
            const ragResponse = await runRag(userMessage);
            agentsCalled.push('RagAgent');
            console.log(`   Confidence: ${ragResponse.confidence?.toFixed(2)}`);

            if (ragResponse.confidence && ragResponse.confidence < 0.5) {
                finalResponse = `${ragResponse.text}\n\n⚠️  I'm not confident about this answer. Let me escalate this to a human support agent.`;
            } else {
                finalResponse = ragResponse.text;
            }
        }

        // Step 3: Display results
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Summary');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`Agents called: ${agentsCalled.join(' → ')}\n`);
        console.log('🤖 Response:');
        console.log(finalResponse);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Error occurred:');
        console.error(error);
        process.exit(1);
    }
}

main();
