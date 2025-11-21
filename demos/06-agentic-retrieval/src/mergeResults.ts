// Implement a function
//   `mergeResults(question: string, hits: SearchHit[]): Promise<string>`
// Use Azure OpenAI chat completion to:
//   - show the model the user question and a numbered list of passages:
//       [1] <text> (source: <title>)
//       [2] ...
//   - ask for a concise answer using ONLY those passages,
//   - require inline citations like [1], [3] referring to the passage numbers,
//   - if there is not enough information, say that explicitly.
// Return the answer as a string.
//
// Keep prompts simple and deterministic, temperature ~0.2.

import { AzureOpenAI } from 'openai';
import { SearchHit } from './searchFanout';

function getClient() {
    return new AzureOpenAI({
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        apiVersion: '2024-08-01-preview',
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT
    });
}

export async function mergeResults(question: string, hits: SearchHit[]): Promise<string> {
    const client = getClient();
    if (hits.length === 0) {
        return "I couldn't find any relevant information in the knowledge base to answer your question.";
    }

    // Build numbered passage list
    const passageList = hits
        .slice(0, 10) // Use top 10 passages
        .map((hit, index) => {
            const source = hit.title || 'Unknown source';
            return `[${index + 1}] ${hit.content.trim()}\n(Source: ${source})`;
        })
        .join('\n\n');

    const systemPrompt = `You are a helpful assistant that answers questions using ONLY the provided passages.

Rules:
- Answer the user's question using ONLY information from the numbered passages below
- Add inline citations like [1], [2] referring to passage numbers
- If multiple passages support a point, cite all relevant ones: [1][3]
- If the passages don't contain enough information, say so explicitly
- Be concise but complete
- Do not add information from your own knowledge`;

    const userPrompt = `Question: ${question}

Passages:
${passageList}

Answer the question using only these passages. Include citations.`;

    const response = await client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT!,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 500
    });

    return response.choices[0]?.message?.content || 'Unable to generate answer.';
}
