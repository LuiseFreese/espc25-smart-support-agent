import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Triage classification endpoint for Copilot Studio plugin
 * 
 * Classifies support ticket text into:
 * - Category: Access, Network, Billing, Software, Other
 * - Priority: High, Medium, Low
 * 
 * This endpoint reuses the same keyword-based triage logic from Demo 04
 * to ensure consistency across the system.
 */
export async function triage(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Triage function triggered');

    try {
        // Parse request body
        const body = await request.json() as { ticket_text?: string };
        const ticketText = body?.ticket_text || '';

        // Validate input
        if (!ticketText || ticketText.trim().length === 0) {
            return {
                status: 400,
                jsonBody: {
                    error: 'ticket_text is required and must not be empty'
                }
            };
        }

        if (ticketText.length < 10) {
            return {
                status: 400,
                jsonBody: {
                    error: 'ticket_text must be at least 10 characters'
                }
            };
        }

        // Perform classification using keyword-based logic
        const result = performTriage(ticketText);

        context.log('Triage result:', result);

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            jsonBody: result
        };

    } catch (error) {
        context.error('Triage error:', error);
        return {
            status: 500,
            jsonBody: {
                error: 'Internal server error during classification'
            }
        };
    }
}

/**
 * Keyword-based triage classification
 * Same logic as AIService.ts from Demo 04
 */
function performTriage(ticketText: string): { category: string; priority: string } {
    const text = ticketText.toLowerCase();

    // Category detection
    let category = 'Other';
    
    if (text.includes('password') || text.includes('login') || text.includes('access') || text.includes('cant sign in') || text.includes("can't sign in")) {
        category = 'Access';
    } else if (text.includes('vpn') || text.includes('network') || text.includes('connection') || text.includes('disconnect') || text.includes('connectivity')) {
        category = 'Network';
    } else if (text.includes('billing') || text.includes('charge') || text.includes('payment') || text.includes('invoice') || text.includes('refund')) {
        category = 'Billing';
    } else if (text.includes('software') || text.includes('application') || text.includes('program') || text.includes('app') || text.includes('install')) {
        category = 'Software';
    }

    // Priority detection
    let priority = 'Medium';
    
    if (text.includes('urgent') || text.includes('critical') || text.includes('asap') || text.includes('emergency') || text.includes('down') || text.includes('outage')) {
        priority = 'High';
    } else if (text.includes('low priority') || text.includes('when you can') || text.includes('no rush') || text.includes('feature request')) {
        priority = 'Low';
    }

    return { category, priority };
}
