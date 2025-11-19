// Implement `runTicket(message: string): Promise<AgentResponse>`.
// Creates real tickets in Azure Table Storage with Status='Agent Created' to prevent auto-reply emails.
// This allows Demo 07 to create tickets without triggering the Demo 04 email workflow.

import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';
import { AgentResponse } from './types';

export async function runTicket(message: string, category?: string): Promise<AgentResponse> {
    const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
    const storageAccountKey = process.env.STORAGE_ACCOUNT_KEY;

    console.log(`[DEBUG] Storage credentials: ${storageAccountName ? 'found' : 'missing'}, ${storageAccountKey ? 'found' : 'missing'}`);

    // Option A: Create real ticket in Table Storage if configured
    if (storageAccountName && storageAccountKey) {
        console.log('[DEBUG] Attempting to create real ticket in Table Storage...');
        try {
            const credential = new AzureNamedKeyCredential(storageAccountName, storageAccountKey);
            const tableClient = new TableClient(
                `https://${storageAccountName}.table.core.windows.net`,
                'SupportTickets',
                credential
            );

            // Create table if it doesn't exist
            try {
                await tableClient.createTable();
            } catch (error: any) {
                if (error?.statusCode !== 409) {
                    throw error;
                }
            }

            // Generate ticket ID
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const ticketId = `TKT-${timestamp}-${randomSuffix}`;

            // Use timestamp + random for rowKey
            const rowKey = `${timestamp}-${randomSuffix}`;

            // Create ticket entity with Status='Agent Created' to prevent auto-reply
            const entity = {
                partitionKey: 'TICKET',
                rowKey: rowKey,
                Title: message.substring(0, 100),
                Description: message,
                Status: 'Agent Created',  // Different status to avoid email auto-reply
                Priority: category === 'Urgent' ? 'High' : 'Medium',
                Category: category || 'Other',
                CustomerEmail: 'demo-user@example.com',  // Placeholder - no real email
                AIResponse: '',  // Will be filled by RAG agent
                TicketID: ticketId,
                Confidence: 0.0,
                CreatedBy: 'Multi-Agent Orchestrator',
                CreatedAt: new Date().toISOString()
            };

            await tableClient.createEntity(entity);

            return {
                text: `Created ticket ${ticketId} for your issue. Our support team will review it shortly.`,
                confidence: 1.0,
                meta: {
                    ticketId,
                    category: category || 'Other',
                    realTicket: true
                }
            };
        } catch (error) {
            console.error('Failed to create ticket in Table Storage:', error);
            // Fall through to Option B
        }
    }

    // Option B: Simulate ticket creation if storage not configured
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    console.log(`[SIMULATED] Created ticket ${ticketId}`);
    console.log(`  Category: ${category || 'Other'}`);
    console.log(`  Message: ${message.substring(0, 100)}...`);

    return {
        text: `Created ticket ${ticketId} for your issue. (Note: This is a simulated ticket for demo purposes)`,
        confidence: 0.8,
        meta: {
            ticketId,
            category: category || 'Other',
            simulated: true
        }
    };
}

/**
 * Update an existing ticket with AI response and confidence
 */
export async function updateTicketWithAIResponse(
    ticketId: string,
    aiResponse: string,
    confidence: number
): Promise<void> {
    const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
    const storageAccountKey = process.env.STORAGE_ACCOUNT_KEY;

    if (!storageAccountName || !storageAccountKey) {
        console.log('[DEBUG] Storage not configured, skipping ticket update');
        return;
    }

    try {
        const credential = new AzureNamedKeyCredential(storageAccountName, storageAccountKey);
        const tableClient = new TableClient(
            `https://${storageAccountName}.table.core.windows.net`,
            'SupportTickets',
            credential
        );

        // Find the ticket by TicketID
        const entities = tableClient.listEntities({
            queryOptions: { filter: `TicketID eq '${ticketId}'` }
        });

        for await (const entity of entities) {
            // Ensure partitionKey and rowKey are strings
            if (!entity.partitionKey || !entity.rowKey) {
                console.error('Entity missing partitionKey or rowKey');
                continue;
            }

            // Update the entity with AI response
            const updatedEntity = {
                partitionKey: entity.partitionKey as string,
                rowKey: entity.rowKey as string,
                AIResponse: aiResponse,
                Confidence: confidence
            };

            await tableClient.updateEntity(updatedEntity, 'Merge');
            console.log(`[DEBUG] Updated ticket ${ticketId} with AI response (confidence: ${confidence})`);
            break; // Only update first match
        }
    } catch (error) {
        console.error('Failed to update ticket with AI response:', error);
    }
}
