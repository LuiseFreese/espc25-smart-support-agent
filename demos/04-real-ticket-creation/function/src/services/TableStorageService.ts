import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';

export interface SupportTicket {
  Title: string;
  Description?: string;
  Status: string;
  Priority: string;
  Category: string;
  CustomerEmail: string;
  AIResponse: string;
  TicketID: string;
  Confidence: number;
  EmailMessageId?: string;  // For deduplication
}

/**
 * Service for storing support tickets in Azure Table Storage.
 *
 * Tickets are stored in a table named 'SupportTickets'.
 *
 * Required environment variables:
 * - STORAGE_ACCOUNT_NAME: Name of the Azure Storage account
 * - STORAGE_ACCOUNT_KEY: Access key for the storage account
 */
export class TableStorageService {
  private tableClient: TableClient;
  private readonly tableName = 'SupportTickets';

  constructor() {
    const accountName = process.env.STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.STORAGE_ACCOUNT_KEY;

    if (!accountName || !accountKey) {
      throw new Error('Missing STORAGE_ACCOUNT_NAME or STORAGE_ACCOUNT_KEY environment variables');
    }

    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    this.tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      this.tableName,
      credential
    );
  }

  /**
   * Initialize table storage (create table if it doesn't exist)
   */
  async initialize(): Promise<void> {
    try {
      await this.tableClient.createTable();
    } catch (error: any) {
      // Table already exists - ignore error
      if (error?.statusCode !== 409) {
        throw error;
      }
    }
  }

  /**
   * Create a new support ticket in Table Storage.
   *
   * @param ticket - The ticket data to store
   * @returns The unique entity ID (rowKey) of the created ticket
   */
  async createTicket(ticket: SupportTicket): Promise<string> {
    try {
      await this.initialize();

      // Generate unique row key from timestamp + random string
      const rowKey = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Table Storage entity - partitionKey groups related entities
      // We use 'TICKET' as partition for all tickets
      const entity = {
        partitionKey: 'TICKET',
        rowKey: rowKey,
        Title: ticket.Title,
        Description: ticket.Description || '',
        Status: ticket.Status,
        Priority: ticket.Priority,
        Category: ticket.Category,
        CustomerEmail: ticket.CustomerEmail,
        AIResponse: ticket.AIResponse,
        TicketID: ticket.TicketID,
        Confidence: ticket.Confidence,
        EmailMessageId: ticket.EmailMessageId || '',  // Store email ID for deduplication
        CreatedAt: new Date().toISOString()
      };

      await this.tableClient.createEntity(entity);
      console.log(`✓ Ticket created in Table Storage: ${rowKey}`);

      return rowKey;
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error(`Failed to create ticket in Table Storage: ${msg}`);
      throw new Error(`Table Storage create failed: ${msg}`);
    }
  }

  /**
   * Update the status of an existing ticket.
   *
   * @param rowKey - The unique row key of the ticket
   * @param status - The new status value
   */
  async updateTicketStatus(rowKey: string, status: string): Promise<void> {
    try {
      const entity = await this.tableClient.getEntity('TICKET', rowKey);

      const updatedEntity = {
        partitionKey: 'TICKET',
        rowKey: rowKey,
        Status: status,
        UpdatedAt: new Date().toISOString(),
        // Preserve all other fields
        Title: entity.Title,
        Description: entity.Description,
        Priority: entity.Priority,
        Category: entity.Category,
        CustomerEmail: entity.CustomerEmail,
        AIResponse: entity.AIResponse,
        TicketID: entity.TicketID,
        Confidence: entity.Confidence,
        CreatedAt: entity.CreatedAt
      };

      await this.tableClient.updateEntity(updatedEntity, 'Merge');
      console.log(`✓ Ticket ${rowKey} status updated to: ${status}`);
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error(`Failed to update ticket status: ${msg}`);
      throw new Error(`Table Storage update failed: ${msg}`);
    }
  }

  /**
   * Get all tickets (for testing/diagnostics)
   */
  async getAllTickets(): Promise<any[]> {
    const tickets: any[] = [];
    const iterator = this.tableClient.listEntities({
      queryOptions: { filter: "PartitionKey eq 'TICKET'" }
    });

    for await (const entity of iterator) {
      tickets.push(entity);
    }

    return tickets;
  }

  /**
   * Find a ticket by email message ID (for deduplication)
   *
   * @param emailMessageId - The Graph API message ID
   * @returns The ticket entity if found, null otherwise
   */
  async findTicketByEmailId(emailMessageId: string): Promise<any | null> {
    if (!emailMessageId) return null;

    try {
      const iterator = this.tableClient.listEntities({
        queryOptions: { filter: `PartitionKey eq 'TICKET' and EmailMessageId eq '${emailMessageId}'` }
      });

      for await (const entity of iterator) {
        return entity;  // Return first match
      }

      return null;  // No match found
    } catch (error) {
      console.error(`Failed to find ticket by email ID: ${error}`);
      return null;  // Return null on error to allow processing to continue
    }
  }
}
