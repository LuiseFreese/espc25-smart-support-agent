import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TableStorageService } from '../services/TableStorageService';
import { AIService } from '../services/AIService';

/**
 * Create Ticket endpoint for Azure AI Foundry agent
 *
 * Creates a support ticket in Azure Table Storage
 * POST /api/ticket
 * Body: { description: string, userEmail: string, category?: string, priority?: string }
 */
export async function createTicket(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('CreateTicket function triggered');

    try {
        // Parse request body
        const body = await request.json() as {
            description?: string;
            userEmail?: string;
            category?: string;
            priority?: string;
            aiResponse?: string;
            confidence?: number;
        };

        const { description, userEmail, category, priority, aiResponse, confidence } = body;

        // Validate required fields
        if (!description || !userEmail) {
            return {
                status: 400,
                jsonBody: {
                    error: 'description and userEmail are required'
                }
            };
        }

        // If category/priority not provided, use triage to determine them
        let ticketCategory = category;
        let ticketPriority = priority;

        if (!ticketCategory || !ticketPriority) {
            const aiService = new AIService();
            const triageResult = await aiService.performTriage(description); // Use public method
            ticketCategory = ticketCategory || triageResult.category;
            ticketPriority = ticketPriority || triageResult.priority;
        }

        // Generate ticket ID
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const ticketID = `TKT-${timestamp}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Create ticket in Table Storage
        const tableService = new TableStorageService();
        const rowKey = await tableService.createTicket({
            Title: description.substring(0, 100),  // Use first 100 chars as title
            Description: description,
            Status: 'Open',
            Priority: ticketPriority,
            Category: ticketCategory,
            CustomerEmail: userEmail,
            AIResponse: aiResponse || '',  // Store AI response if provided
            TicketID: ticketID,  // Use generated ticket ID
            Confidence: confidence || 0,  // Store confidence if provided
            EmailMessageId: `api-${Date.now()}`  // Generate unique ID for API calls
        });

        context.log(`Ticket created: ${ticketID}`);

        // Return ticket details
        return {
            status: 201,
            jsonBody: {
                ticketId: ticketID,
                status: 'Open',
                category: ticketCategory,
                priority: ticketPriority,
                createdAt: new Date().toISOString(),
                confidence: confidence || 0
            }
        };

    } catch (error) {
        context.log('Error creating ticket:', error);
        return {
            status: 500,
            jsonBody: {
                error: 'Failed to create ticket',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}
