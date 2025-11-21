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

// Retry wrapper with exponential backoff for rate limit errors
async function retryWithBackoff<T>(
    fn: () => Promise<T>, 
    maxRetries = 2, 
    initialDelay = 10000 // Start with 10 seconds - Azure OpenAI rate limits need recovery time
): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            
            // Check if it's a rate limit error (429)
            if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
                if (i < maxRetries - 1) { // Only retry if not last attempt
                    const delay = initialDelay * Math.pow(2, i); // 10s → 20s
                    console.log(`⏳ Azure OpenAI rate limited, waiting ${delay/1000}s before retry (attempt ${i + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.log(`❌ Rate limit persists after ${maxRetries} attempts - Azure quota likely exhausted`);
                    throw error;
                }
            } else {
                // Not a rate limit error, don't retry
                throw error;
            }
        }
    }
    
    throw lastError;
}

export async function planQueries(question: string, history?: string[]): Promise<{ queries: string[], usage: { prompt: number, completion: number, total: number } }> {
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

    const response = await retryWithBackoff(() => 
        client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT!,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_completion_tokens: 200
        })
    );

    // Capture token usage
    const usage = {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0
    };

    // Log token usage
    console.log(`📊 Query Planning tokens: prompt=${usage.prompt}, completion=${usage.completion}, total=${usage.total}`);

    const content = response.choices[0]?.message?.content || '';

    // Parse response into array of queries, stripping numbering/bullets
    const queries = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^[\d\-\*\•\.]+\s*/, '')) // Remove numbering/bullets
        .filter(line => line.length > 0)
        .slice(0, 4); // Max 4 queries

    return { queries, usage };
}
