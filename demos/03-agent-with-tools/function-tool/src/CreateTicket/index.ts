import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as appInsights from 'applicationinsights';
import * as crypto from 'crypto';

export async function CreateTicket(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('CreateTicket function triggered');

  try {
    const body = await request.json();

    const { title, description, customerId } = body as any;

    // Validate required fields
    if (!title || !description || !customerId) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields: title, description, customerId',
        },
      };
    }

    // Generate ticket ID
    const ticketId = `TKT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const ticket = {
      ticketId,
      title,
      description,
      customerId,
      status: 'Open',
      priority: 'Medium',
      createdAt: new Date().toISOString(),
      assignedTo: null,
    };

    // In production, this would save to a database
    context.log('Created ticket:', ticket);

    // Track custom event
    if (appInsights.defaultClient) {
      appInsights.defaultClient.trackEvent({
        name: 'TicketCreated',
        properties: {
          ticketId,
          customerId,
          priority: ticket.priority,
        },
      });
    }

    return {
      status: 201,
      jsonBody: ticket,
    };
  } catch (error: any) {
    context.error('Error in CreateTicket:', error);

    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

app.http('CreateTicket', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: CreateTicket,
});
