// Build a CLI demo for **agentic retrieval** on top of Azure AI Search.
// Steps:
// 1. Read a question from process.argv or stdin.
// 2. Call an LLM (Azure OpenAI) to generate 2–4 focused sub-queries from the user question.
//    - Use a small helper function in queryPlanning.ts.
//    - Return an array of strings: subQueries: string[].
// 3. For each sub-query, call Azure AI Search (same index and env vars as demos/02-rag-search).
//    - Implement this in searchFanout.ts.
//    - Use semantic search / vector search if available, return top 5 results per sub-query.
// 4. Collect results into a flat list of passages with metadata:
//    - text/content
//    - source/title
//    - subQuery index
// 5. Call the LLM again (mergeResults.ts) with:
//    - original question
//    - list of passages (with numbered IDs)
//    Ask the model to:
//    - write one concise answer using only these passages,
//    - add citations like [1], [2] based on passage IDs,
//    - ignore irrelevant passages.
// 6. Print to console:
//    - "User question: ..."
//    - "Planned sub-queries:"
//    - "Search results (top N):" with IDs + titles
//    - "Final answer:"
// 7. Handle missing config gracefully: if env vars are missing, show a helpful error message and exit with code 1.

import * as dotenv from 'dotenv';
import { planQueries } from './queryPlanning';
import { runSearchFanout, SearchHit } from './searchFanout';
import { mergeResults } from './mergeResults';

dotenv.config();

async function main() {
    // Validate environment variables
    const requiredEnvVars = [
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_DEPLOYMENT',
        'AZURE_AI_SEARCH_ENDPOINT',
        'AZURE_AI_SEARCH_API_KEY',
        'AZURE_AI_SEARCH_INDEX'
    ];

    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please copy .env.example to .env and fill in the values.');
        process.exit(1);
    }

    // Get question from command line arguments
    const question = process.argv.slice(2).join(' ');
    if (!question) {
        console.error('Usage: npm run dev -- "Your question here"');
        process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 AGENTIC RETRIEVAL DEMO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 1: Query Planning
    console.log(`📝 User question: "${question}"\n`);
    console.log('🤔 Planning sub-queries...');
    const planResult = await planQueries(question);
    const subQueries = planResult.queries;
    console.log(`✓ Generated ${subQueries.length} sub-queries:\n`);
    subQueries.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));
    console.log();

    // Step 2: Search Fanout
    console.log('🔎 Searching knowledge base...');
    const searchHits = await runSearchFanout(subQueries);
    console.log(`✓ Found ${searchHits.length} passages\n`);

    // Display search results
    console.log('📚 Search Results:');
    const uniqueHits = searchHits.slice(0, 10); // Top 10 for display
    uniqueHits.forEach((hit, i) => {
        console.log(`   [${i + 1}] ${hit.title || 'Untitled'}`);
        console.log(`       ${hit.content.substring(0, 100)}...`);
    });
    console.log();

    // Step 3: Merge Results
    console.log('💭 Generating final answer...');
    const mergeResult = await mergeResults(question, searchHits);
    const finalAnswer = mergeResult.answer;
    console.log('✓ Answer ready\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FINAL ANSWER:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(finalAnswer);
    console.log();
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
