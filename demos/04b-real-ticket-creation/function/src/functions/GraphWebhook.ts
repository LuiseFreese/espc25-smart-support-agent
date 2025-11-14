import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { GraphService } from '../services/GraphService';
import { TableStorageService } from '../services/TableStorageService';
import { AIService } from '../services/AIService';

/**
 * Graph webhook endpoint for Microsoft Graph change notifications
 * Triggered when new emails arrive in the monitored mailbox
 *
 * Microsoft Graph will:
 * 1. First validate the endpoint (validationToken in query)
 * 2. Then send notifications when emails arrive
 */
export async function GraphWebhook(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('📨 Graph webhook triggered');

  // Step 1: Handle subscription validation (required by Microsoft Graph)
  const validationToken = request.query.get('validationToken');
  if (validationToken) {
    context.log('✅ Webhook validation request received');
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: validationToken
    };
  }

  // Step 2: Process change notification
  try {
    const body = await request.text();
    const notification = JSON.parse(body);

    context.log('📧 Change notification received:', JSON.stringify(notification, null, 2));

    // Microsoft Graph sends notifications in this format:
    // { value: [{ changeType: "created", resource: "..." }] }
    if (!notification.value || !Array.isArray(notification.value)) {
      return {
        status: 202,
        body: 'No notifications to process'
      };
    }

    const storageService = new TableStorageService();
    const graphService = new GraphService();
    const aiService = new AIService();

    let processedCount = 0;

    for (const change of notification.value) {
      try {
        context.log(`Processing change: ${change.changeType} on ${change.resource}`);

        // Only process "created" events (new emails)
        if (change.changeType !== 'created') {
          context.log('Skipping non-created event');
          continue;
        }

        // Extract message ID from resource URL
        // Format: "Users/{userId}/Messages/{messageId}"
        const messageIdMatch = change.resource.match(/Messages\/([^/]+)/);
        if (!messageIdMatch) {
          context.log('Could not extract message ID from resource');
          continue;
        }

        const messageId = messageIdMatch[1];
        context.log(`Processing message ID: ${messageId}`);

        // Get the full email details
        const email = await graphService.getEmailById(messageId);

        if (!email) {
          context.log(`Email ${messageId} not found`);
          continue;
        }

        context.log(`Processing email: "${email.subject}" from ${email.from.emailAddress.address}`);

        // CRITICAL: Skip emails from our own support address to prevent infinite loops
        const supportEmail = process.env.SUPPORT_EMAIL_ADDRESS?.toLowerCase();
        const fromEmail = email.from.emailAddress.address.toLowerCase();

        if (fromEmail === supportEmail) {
          context.log(`🛑 SKIPPING email from ourselves (${fromEmail}) to prevent infinite loop`);
          await graphService.markAsRead(messageId);
          continue;
        }

        // Check for duplicate (already processed)
        const existingTicket = await storageService.findTicketByEmailId(messageId);
        if (existingTicket) {
          context.log(`Skipping duplicate email: ${messageId} (already processed as ${existingTicket.TicketID})`);
          continue;
        }

        // Extract email content (convert HTML to plain text, preserving line breaks)
        const emailBody = email.body.content
          .replace(/<br\s*\/?>/gi, '\n')           // Convert <br> to newline
          .replace(/<\/p>/gi, '\n\n')               // Convert </p> to double newline
          .replace(/<\/div>/gi, '\n')               // Convert </div> to newline
          .replace(/<\/h[1-6]>/gi, '\n\n')          // Convert heading endings to double newline
          .replace(/<[^>]*>/g, '')                  // Remove all other HTML tags
          .replace(/&nbsp;/g, ' ')                  // Convert &nbsp; to space
          .replace(/\n{3,}/g, '\n\n')               // Normalize multiple newlines to max 2
          .slice(0, 5000)
          .trim();
        const customerEmail = email.from.emailAddress.address;

        // Step 1: Triage
        context.log('Performing triage...');
        const triage = await aiService.triageTicket(emailBody);
        context.log(`Triage result: ${triage.category} / ${triage.priority}`);

        // Step 2: RAG Search
        context.log('Searching knowledge base...');
        const rag = await aiService.searchKnowledgeBase(emailBody);
        context.log(`RAG confidence: ${rag.confidence}`);

        // Step 3: Generate Ticket ID
        const ticketId = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        context.log(`Generated ticket ID: ${ticketId}`);

        // Step 4: Create ticket in Table Storage
        const rowKey = await storageService.createTicket({
          Title: email.subject,
          Description: emailBody,
          Status: 'New',
          Priority: triage.priority,
          Category: triage.category,
          CustomerEmail: customerEmail,
          AIResponse: rag.answer,
          TicketID: ticketId,
          Confidence: rag.confidence,
          EmailMessageId: messageId
        });
        context.log(`✅ Ticket created: ${ticketId}`);

        // Step 5: Send response or forward based on confidence
        if (rag.confidence >= 0.7) {
          // High confidence - auto-reply
          context.log('Sending auto-reply (high confidence)...');
          await graphService.sendReply(
            customerEmail,
            email.subject,
            rag.answer,
            ticketId
          );
          await storageService.updateTicketStatus(rowKey, 'AI Resolved - Awaiting Confirmation');
          context.log('✅ Auto-reply sent');
        } else {
          // Low confidence - forward to support team
          context.log('Forwarding to support team (low confidence)...');
          const supportTeamEmail = process.env.SUPPORT_TEAM_EMAIL || customerEmail;

          await graphService.forwardToSupport(
            supportTeamEmail,
            email.subject,
            ticketId,
            triage.category,
            triage.priority,
            rag.confidence,
            customerEmail,
            emailBody,
            rag.answer
          );
          await storageService.updateTicketStatus(rowKey, 'Needs Human Review');
          context.log('✅ Forwarded to support team');
        }

        // Mark email as read
        await graphService.markAsRead(messageId);
        processedCount++;

      } catch (error) {
        context.error(`Failed to process notification:`, error);
        // Continue with next notification
      }
    }

    return {
      status: 202,
      jsonBody: {
        message: `Processed ${processedCount} email notification(s)`,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    context.error('Webhook processing failed:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to process webhook notification',
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
