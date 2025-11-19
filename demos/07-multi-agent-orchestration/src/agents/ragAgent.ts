// Implement `runRag(question: string): Promise<AgentResponse>`.
// Reuse the same pattern as demos/02-rag-search, but simplified:
// - run one search against Azure AI Search with the question,
// - take top N passages,
// - ask Azure OpenAI to answer using ONLY those passages,
// - return answer and a confidence score based on how many hits were found.
// Keep env var names consistent with other RAG demo.

import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import { AgentResponse } from './types';

export async function runRag(question: string): Promise<AgentResponse> {
    const searchEndpoint = process.env.AZURE_AI_SEARCH_ENDPOINT!;
    const searchKey = process.env.AZURE_AI_SEARCH_API_KEY?.trim()!;
    const indexName = process.env.AZURE_AI_SEARCH_INDEX || 'kb-support';

    const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim()!;
    const openaiKey = process.env.AZURE_OPENAI_API_KEY?.trim()!;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

    // Initialize clients
    const searchClient = new SearchClient(
        searchEndpoint,
        indexName,
        new AzureKeyCredential(searchKey)
    );

    const openai = new AzureOpenAI({
        endpoint: openaiEndpoint,
        apiKey: openaiKey,
        apiVersion: '2024-08-01-preview',
        deployment
    });

    // Search Azure AI Search
    const searchResults = await searchClient.search(question, {
        top: 5,
        select: ['title', 'content']
    });

    const passages: string[] = [];
    for await (const result of searchResults.results) {
        const doc = result.document as { title?: string; content?: string };
        if (doc.content) {
            passages.push(`**${doc.title || 'Document'}**\n${doc.content}`);
        }
    }

    if (passages.length === 0) {
        return {
            text: 'I could not find relevant information in the knowledge base.',
            confidence: 0.1
        };
    }

    // Generate answer using OpenAI
    const context = passages.join('\n\n');
    const completion = await openai.chat.completions.create({
        model: deployment,
        messages: [
            {
                role: 'system',
                content: `You are a helpful IT support assistant. Answer the question using ONLY the context below. If the context doesn't contain the answer, say so.\n\nContext:\n${context}`
            },
            {
                role: 'user',
                content: question
            }
        ],
        temperature: 0.3,
        max_tokens: 500
    });

    const answer = completion.choices[0]?.message?.content || 'No answer generated.';

    // Calculate confidence based on number of passages found
    const confidence = Math.min(0.9, passages.length / 5);

    return {
        text: answer,
        confidence,
        meta: {
            passagesFound: passages.length
        }
    };
}
