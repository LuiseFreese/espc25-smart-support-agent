import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TableStorageService } from '../services/TableStorageService';

/**
 * Simple HTTP endpoint to test Table Storage connectivity in isolation.
 *
 * This bypasses email processing and AI classification to verify that:
 * 1. Storage account authentication works
 * 2. Table creation/access works
 * 3. Entity creation works
 *
 * Usage: GET https://<function-app>.azurewebsites.net/api/pingstorage
 *
 * Returns:
 * - 201: Successfully created test ticket (returns row key)
 * - 500: Error (returns error message)
 */
export async function PingStorage(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('PingStorage: Testing Table Storage connectivity...');

  try {
    const storage = new TableStorageService();

    const testTicket = {
      Title: `Table Storage Test - ${new Date().toISOString()}`,
      Description: 'This is a test ticket created by the PingStorage endpoint to verify Table Storage access.',
      Status: 'New',
      Priority: 'Low',
      Category: 'Test',
      CustomerEmail: 'test@example.com',
      AIResponse: 'N/A - This is a connectivity test',
      TicketID: `PING-${Date.now()}`,
      Confidence: 1.0
    };

    context.log('Creating test ticket in Table Storage...');
    const rowKey = await storage.createTicket(testTicket);

    context.log(`✓ Test ticket created successfully: ${rowKey}`);

    return {
      status: 201,
      jsonBody: {
        success: true,
        rowKey,
        message: 'Table Storage connectivity test passed',
        ticket: testTicket
      }
    };
  } catch (error: any) {
    context.error('✗ Table Storage connectivity test failed:', error);

    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error?.message || String(error),
        code: error?.code || error?.statusCode || 'unknown'
      }
    };
  }
}

app.http('PingStorage', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: PingStorage
});
