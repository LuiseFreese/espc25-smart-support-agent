import { Client } from '@microsoft/microsoft-graph-client';
import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email';
import { createGraphClient } from '../lib/graphClient';
import { EmailMessage } from '../models/Ticket';

export class GraphService {
  private client: Client;
  private emailClient: EmailClient | null;
  private supportEmail: string;
  private communicationSenderAddress: string;

  constructor() {
    this.supportEmail = process.env.SUPPORT_EMAIL_ADDRESS || '';
    this.client = createGraphClient();
    
    // Initialize Azure Communication Services Email client if connection string is available
    const commConnectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
    const commSenderAddress = process.env.COMMUNICATION_SERVICES_SENDER_ADDRESS;
    
    if (commConnectionString && commSenderAddress) {
      this.emailClient = new EmailClient(commConnectionString);
      this.communicationSenderAddress = commSenderAddress;
      console.log('✅ Using Azure Communication Services for email sending');
    } else {
      this.emailClient = null;
      this.communicationSenderAddress = '';
      console.warn('⚠️ Azure Communication Services not configured - email sending will fail');
    }
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
    // Use Azure Communication Services for sending (works in all tenants)
    if (this.emailClient && this.communicationSenderAddress) {
      try {
        console.log(`Sending email via Azure Communication Services to ${to}...`);
        
        const emailMessage = {
          senderAddress: this.communicationSenderAddress,
          content: {
            subject: `Re: ${subject}`,
            html: `
              <p>Hello,</p>
              <p>We've received your support request and created ticket <strong>${ticketId}</strong>.</p>
              <p><strong>Based on our knowledge base:</strong></p>
              <p>${body}</p>
              <p>If this resolves your issue, you can reply with "RESOLVED" to close the ticket.</p>
              <p>Otherwise, a support agent will follow up within 2 hours.</p>
              <p>Best regards,<br>Support Team</p>
            `
          },
          recipients: {
            to: [{ address: to }]
          }
        };

        const poller = await this.emailClient.beginSend(emailMessage);
        const result = await poller.pollUntilDone();
        
        if (result.status === KnownEmailSendStatus.Succeeded) {
          console.log(`✅ Email sent successfully via Azure Communication Services (ID: ${result.id})`);
        } else {
          console.error(`⚠️ Email send status: ${result.status}`);
          throw new Error(`Email send failed with status: ${result.status}`);
        }
        
      } catch (error: any) {
        console.error('❌ Failed to send email via Azure Communication Services:', error);
        throw new Error(`Communication Services error: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Fallback error (Communication Services should always be configured)
      throw new Error('Azure Communication Services not configured. Cannot send email.');
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
