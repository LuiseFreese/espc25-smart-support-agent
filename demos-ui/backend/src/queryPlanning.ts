// Implement a function `planQueries(question: string, history?: string[]): Promise<string[]>`.
// Use Azure OpenAI chat completion (via `openai` client) to:
// - take the current question and optional previous turns,
// - return 2–4 focused search queries,
// - avoid changing the meaning of the question,
// - keep queries short (max ~15 words).
// Parse the model response into an array of strings, stripping numbering / bullets.

import { AzureOpenAI } from 'openai';

function getClient() {
    return new AzureOpenAI({
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        apiVersion: '2024-08-01-preview',
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT
    });
}

export async function planQueries(question: string, history?: string[]): Promise<string[]> {
    const client = getClient();

    const systemPrompt = `You are a query planning assistant. Given a user question, decompose it into 2-4 focused search queries that can be executed in parallel.

Rules:
- Each query should be short (max 15 words)
- Each query should focus on one aspect of the question
- Do not change the meaning of the original question
- Return only the queries, one per line
- Do not add numbering, bullets, or explanations`;

    const userPrompt = history && history.length > 0
        ? `Previous conversation:\n${history.join('\n')}\n\nCurrent question: ${question}`
        : `Question: ${question}`;

    const response = await client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT!,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 200
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse response into array of queries, stripping numbering/bullets
    const queries = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^[\d\-\*\•\.]+\s*/, '')) // Remove numbering/bullets
        .filter(line => line.length > 0)
        .slice(0, 4); // Max 4 queries

    return queries;
}
