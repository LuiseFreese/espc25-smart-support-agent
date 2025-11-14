import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { GraphService } from '../services/GraphService';
import { TableStorageService } from '../services/TableStorageService';
import { AIService } from '../services/AIService';

export async function ProcessSupportEmail(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Processing support email...');

  try {
    const storageService = new TableStorageService();
    const aiService = new AIService();

    // Check if this is a direct POST with email data (test/simulation mode)
    const requestBody = await request.text();
    if (request.method === 'POST' && requestBody) {
      try {
        const emailData = JSON.parse(requestBody);

        // Validate required fields
        if (!emailData.subject || !emailData.body) {
          return {
            status: 400,
            jsonBody: {
              error: 'Invalid request',
              details: 'Request body must include subject and body fields'
            }
          };
        }

        context.log('Processing direct email data (simulation mode)');
        context.log(`Subject: ${emailData.subject}`);

        // Process the email data
        const emailBody = emailData.body.slice(0, 5000).trim();
        const customerEmail = emailData.from || 'unknown@example.com';

        // Step 1: Triage
        context.log('Calling triage endpoint...');
        const triage = await aiService.triageTicket(emailBody);
        context.log(`Triage result: ${triage.category} / ${triage.priority}`);

        // Step 2: RAG Search
        context.log('Calling RAG endpoint...');
        const rag = await aiService.searchKnowledgeBase(emailBody);
        context.log(`RAG confidence: ${rag.confidence}`);

        // Step 3: Generate Ticket ID
        const ticketId = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        context.log(`Generated ticket ID: ${ticketId}`);

        // Step 4: Create Table Storage entity
        context.log('Creating ticket in Table Storage...');
        const rowKey = await storageService.createTicket({
          Title: emailData.subject,
          Description: emailBody,
          Status: 'New',
          Priority: triage.priority,
          Category: triage.category,
          CustomerEmail: customerEmail,
          AIResponse: rag.answer,
          TicketID: ticketId,
          Confidence: rag.confidence
        });
        context.log(`Ticket created in Table Storage: ${rowKey}`);

        // Return success response
        return {
          status: 200,
          jsonBody: {
            ticketId,
            category: triage.category,
            priority: triage.priority,
            status: 'New',
            confidence: rag.confidence,
            suggestedResponse: rag.answer,
            message: 'Ticket created successfully'
          }
        };

      } catch (parseError) {
        // If JSON parsing fails, fall through to mailbox mode
        context.log('Not valid JSON, switching to mailbox mode');
      }
    }

    // Mailbox reading mode - requires SUPPORT_EMAIL_ADDRESS
    context.log('Mailbox reading mode - checking environment variables...');
    const hasClientId = !!process.env.GRAPH_CLIENT_ID;
    const hasClientSecret = !!process.env.GRAPH_CLIENT_SECRET;
    const hasTenantId = !!process.env.GRAPH_TENANT_ID;
    const hasEmailAddress = !!process.env.SUPPORT_EMAIL_ADDRESS;

    context.log(`Environment check: ClientId=${hasClientId}, ClientSecret=${hasClientSecret}, TenantId=${hasTenantId}, Email=${hasEmailAddress}`);

    if (!hasClientId || !hasClientSecret || !hasTenantId || !hasEmailAddress) {
      return {
        status: 500,
        jsonBody: {
          error: 'Missing required environment variables for mailbox mode',
          details: `ClientId=${hasClientId}, ClientSecret=${hasClientSecret}, TenantId=${hasTenantId}, Email=${hasEmailAddress}`
        }
      };
    }

    const graphService = new GraphService();

    // Get unread emails
    const emails = await graphService.getUnreadEmails();
    context.log(`Found ${emails.length} unread emails`);

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Process each email
    for (const email of emails) {
      try {
        context.log(`Processing email: ${email.subject}`);

        // CRITICAL: Skip emails from our own support address to prevent infinite loops
        const supportEmail = process.env.SUPPORT_EMAIL_ADDRESS?.toLowerCase();
        const fromEmail = email.from.emailAddress.address.toLowerCase();

        if (fromEmail === supportEmail) {
          context.log(`🛑 SKIPPING email from ourselves (${fromEmail}) to prevent infinite loop`);
          await graphService.markAsRead(email.id);
          successCount++;
          continue;
        }

        // Check for duplicate (already processed)
        const existingTicket = await storageService.findTicketByEmailId(email.id);
        if (existingTicket) {
          context.log(`Skipping duplicate email: ${email.id} (already processed as ${existingTicket.TicketID})`);
          continue;
        }

        // Extract email content (convert HTML to plain text, preserving line breaks)
        // Strip HTML and limit body length to avoid huge payloads
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
        const customerEmail = email.from.emailAddress.address;        // Step 1: Triage
        context.log('Calling triage endpoint...');
        const triage = await aiService.triageTicket(emailBody);
        context.log(`Triage result: ${triage.category} / ${triage.priority}`);

        // Step 2: RAG Search
        context.log('Calling RAG endpoint...');
        const rag = await aiService.searchKnowledgeBase(emailBody);
        context.log(`RAG confidence: ${rag.confidence}`);

        // Step 3: Generate Ticket ID
        const ticketId = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        context.log(`Generated ticket ID: ${ticketId}`);

        // Step 4: Create Table Storage entity
        context.log('Creating ticket in Table Storage...');
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
          EmailMessageId: email.id  // Store email ID for deduplication
        });
        context.log(`Ticket created in Table Storage: ${rowKey}`);

        // Step 5: Send response or forward
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
          context.log('Auto-reply sent');
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
          context.log('Forwarded to support team');
        }

        // Mark email as read
        await graphService.markAsRead(email.id);
        context.log('Email marked as read');
        successCount++;

      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Email "${email.subject}": ${errorMsg}`);
        context.error(`Failed to process email ${email.id}:`, error);
        // Continue with next email
      }
    }

    return {
      status: 200,
      jsonBody: {
        total: emails.length,
        succeeded: successCount,
        failed: failureCount,
        errors: errors,
        message: `Processed ${successCount}/${emails.length} emails successfully`
      }
    };

  } catch (error) {
    context.error('Function failed:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to process support emails',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    };
  }
}
