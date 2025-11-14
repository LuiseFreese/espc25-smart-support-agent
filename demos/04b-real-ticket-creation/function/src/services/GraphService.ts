import { Client } from '@microsoft/microsoft-graph-client';
import { createGraphClient } from '../lib/graphClient';
import { EmailMessage } from '../models/Ticket';

export class GraphService {
  private client: Client;
  private supportEmail: string;

  constructor() {
    this.supportEmail = process.env.SUPPORT_EMAIL_ADDRESS || '';
    this.client = createGraphClient();
  }

  async getUnreadEmails(): Promise<EmailMessage[]> {
    try {
      const response = await this.client
        .api(`/users/${this.supportEmail}/mailFolders/Inbox/messages`)
        .filter('isRead eq false')
        .select('id,subject,body,from,receivedDateTime')
        .top(10)
        .get();

      return response.value;
    } catch (error: any) {
      console.error('Failed to get unread emails:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Graph API error: ${error.message || error.code || 'Unknown error'} - ${error.statusCode || ''}`);
    }
  }

  async getEmailById(messageId: string): Promise<EmailMessage | null> {
    try {
      const email = await this.client
        .api(`/users/${this.supportEmail}/messages/${messageId}`)
        .select('id,subject,body,from,receivedDateTime')
        .get();

      return email;
    } catch (error: any) {
      console.error(`Failed to get email ${messageId}:`, error);
      return null;
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client
        .api(`/users/${this.supportEmail}/messages/${messageId}`)
        .patch({ isRead: true });
    } catch (error) {
      console.error('Failed to mark email as read:', error);
    }
  }

  async sendReply(
    to: string,
    subject: string,
    body: string,
    ticketId: string
  ): Promise<void> {
    try {
      const message = {
        message: {
          subject: `Re: ${subject}`,
          body: {
            contentType: 'HTML',
            content: `
              <p>Hello,</p>
              <p>We've received your support request and created ticket <strong>${ticketId}</strong>.</p>
              <p><strong>Based on our knowledge base:</strong></p>
              <p>${body}</p>
              <p>If this resolves your issue, you can reply with "RESOLVED" to close the ticket.</p>
              <p>Otherwise, a support agent will follow up within 2 hours.</p>
              <p>Best regards,<br>Support Team</p>
            `
          },
          toRecipients: [
            {
              emailAddress: {
                address: to
              }
            }
          ]
        }
      };

      await this.client
        .api(`/users/${this.supportEmail}/sendMail`)
        .post(message);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async forwardToSupport(
    to: string,
    originalSubject: string,
    ticketId: string,
    category: string,
    priority: string,
    confidence: number,
    customerEmail: string,
    originalMessage: string,
    aiResponse: string
  ): Promise<void> {
    try {
      const message = {
        message: {
          subject: `[Manual Review Required] ${originalSubject} - ${ticketId}`,
          body: {
            contentType: 'HTML',
            content: `
              <p><strong>Low confidence AI response - manual review needed</strong></p>
              <p><strong>Ticket ID:</strong> ${ticketId}</p>
              <p><strong>From:</strong> ${customerEmail}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Priority:</strong> ${priority}</p>
              <p><strong>Confidence:</strong> ${confidence}</p>
              <p><strong>Original Message:</strong></p>
              <p>${originalMessage}</p>
              <p><strong>AI Suggested Response:</strong></p>
              <p>${aiResponse}</p>
            `
          },
          toRecipients: [
            {
              emailAddress: {
                address: to
              }
            }
          ],
          importance: 'high'
        }
      };

      await this.client
        .api(`/users/${this.supportEmail}/sendMail`)
        .post(message);
    } catch (error) {
      console.error('Failed to forward email:', error);
      throw error;
    }
  }
}
