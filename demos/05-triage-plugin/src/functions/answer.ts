import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import axios from 'axios';

/**
 * RAG-powered answer endpoint for Copilot Studio plugin
 *
 * Searches knowledge base and returns:
 * - answer: AI-generated response based on KB documents
 * - confidence: Score from 0.1-0.95 indicating answer quality
 * - source: KB document that provided the answer
 *
 * This endpoint calls the existing Demo 02 RAG function to ensure
 * consistency with the email automation system (Demo 04).
 */
export async function answer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Answer function triggered');

    try {
        // Parse request body
        const body = await request.json() as { question?: string };
        const question = body?.question || '';

        // Validate input
        if (!question || question.trim().length === 0) {
            return {
                status: 400,
                jsonBody: {
                    error: 'question is required and must not be empty'
                }
            };
        }

        if (question.length < 5) {
            return {
                status: 400,
                jsonBody: {
                    error: 'question must be at least 5 characters'
                }
            };
        }

        // Get RAG endpoint configuration from environment
        const ragEndpoint = process.env.RAG_ENDPOINT;
        const ragApiKey = process.env.RAG_API_KEY;

        if (!ragEndpoint) {
            context.error('RAG_ENDPOINT not configured');
            return {
                status: 500,
                jsonBody: {
                    error: 'RAG search service not configured'
                }
            };
        }

        // Call RAG function (Demo 02)
        context.log('Calling RAG endpoint:', ragEndpoint);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (ragApiKey) {
            headers['x-functions-key'] = ragApiKey;
        }

        const ragResponse = await axios.post(
            ragEndpoint,
            { question },
            {
                headers,
                timeout: 90000  // 90 seconds for RAG search
            }
        );

        const result = {
            answer: ragResponse.data.answer || 'I could not find a specific answer in our knowledge base.',
            confidence: ragResponse.data.confidence || 0.3,
            source: ragResponse.data.sources?.[0] || 'unknown',  // RAG returns array of sources, get first one
            sourceUrl: ragResponse.data.sourceUrl || ''  // Empty string if no URL (OpenAPI 2.0 compatible)
        };

        context.log('RAG result:', { confidence: result.confidence, source: result.source, sourceUrl: result.sourceUrl, allSources: ragResponse.data.sources });

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            jsonBody: result
        };

    } catch (error) {
        context.error('Answer function error:', error);

        // Check if it's a RAG endpoint error
        if (axios.isAxiosError(error)) {
            const statusCode = error.response?.status || 500;
            return {
                status: statusCode,
                jsonBody: {
                    error: 'Failed to retrieve answer from knowledge base',
                    details: error.message
                }
            };
        }

        return {
            status: 500,
            jsonBody: {
                error: 'Internal server error during answer generation'
            }
        };
    }
}
