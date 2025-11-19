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

  /**
   * Converts Markdown-style text to HTML
   * Handles: **bold**, numbered lists, paragraphs, links
   */
  private convertToHtml(text: string): string {
    let html = text;

    // Convert **bold** to <strong>
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert numbered lists to bullet lists (ul instead of ol)
    const lines = html.split('\n');
    let inList = false;
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const numberedListMatch = line.match(/^(\d+)\.\s+(.+)$/);

      if (numberedListMatch) {
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
        }
        processedLines.push(`<li>${numberedListMatch[2]}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (line) {
          processedLines.push(`<p>${line}</p>`);
        }
      }
    }

    if (inList) {
      processedLines.push('</ul>');
    }

    html = processedLines.join('\n');

    // Convert [text](url) to <a href="url">text</a>
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    return html;
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

        // Convert Markdown-style formatting to HTML
        const htmlBody = this.convertToHtml(body);

        const emailMessage = {
          senderAddress: this.communicationSenderAddress,
          content: {
            subject: `Re: ${subject}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .logo { text-align: center; padding: 20px; background: white; }
    .logo img { max-width: 200px; height: auto; }
    .header { background: linear-gradient(135deg, #0078d4 0%, #00bcf2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .ticket-badge { background: white; color: #0078d4; padding: 5px 12px; border-radius: 4px; display: inline-block; font-weight: bold; margin-top: 10px; }
    .content { background: #f9f9f9; padding: 25px; border-left: 4px solid #0078d4; }
    .solution-box { background: white; border: 1px solid #e1e1e1; border-radius: 6px; padding: 20px; margin: 15px 0; }
    .solution-box h2 { color: #0078d4; margin-top: 0; font-size: 18px; border-bottom: 2px solid #0078d4; padding-bottom: 10px; }
    .footer { background: #f3f3f3; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
    .button { background: #0078d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
    .button:hover { background: #005a9e; }
    ul { padding-left: 20px; }
    ul li { margin: 10px 0; }
    strong { color: #0078d4; }
    a { color: #0078d4; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://raw.githubusercontent.com/LuiseFreese/espc25-smart-support-agent/main/demos-ui/public/espc-logo.png" alt="ESPC Logo" />
    </div>
    <div class="header">
      <h1>Support Request Received</h1>
      <div class="ticket-badge">Ticket ${ticketId}</div>
    </div>

    <div class="content">
      <p>Hello,</p>
      <p>Thank you for contacting support. We've analyzed your request and found a solution in our knowledge base.</p>

      <div class="solution-box">
        <h2>Recommended Solution</h2>
        ${htmlBody}
      </div>

      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Try the steps above to resolve your issue</li>
        <li>If this solves your problem, reply with <strong>"RESOLVED"</strong> to close the ticket</li>
        <li>If you need further assistance, just reply to this email - a support agent will follow up within 2 hours</li>
      </ul>
    </div>

    <div class="footer">
      <p>This is an automated response powered by AI</p>
      <p>Best regards,<br><strong>IT Support Team</strong></p>
    </div>
  </div>
</body>
</html>
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
      const priorityColor = priority === 'High' ? '#d13438' : priority === 'Medium' ? '#ffb900' : '#107c10';
      const htmlAiResponse = this.convertToHtml(aiResponse);

      const message = {
        message: {
          subject: `[Manual Review Required] ${originalSubject} - ${ticketId}`,
          body: {
            contentType: 'HTML',
            content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .alert-header { background: #d13438; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .alert-header h1 { margin: 0; font-size: 22px; }
    .metadata { background: #f9f9f9; padding: 20px; border-left: 4px solid #d13438; }
    .metadata-row { display: flex; margin: 10px 0; }
    .metadata-label { font-weight: bold; width: 150px; color: #666; }
    .metadata-value { flex: 1; }
    .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; color: white; background: ${priorityColor}; }
    .confidence-low { color: #d13438; font-weight: bold; }
    .section { background: white; border: 1px solid #e1e1e1; border-radius: 6px; padding: 20px; margin: 15px 0; }
    .section h2 { color: #0078d4; margin-top: 0; font-size: 16px; border-bottom: 2px solid #0078d4; padding-bottom: 8px; }
    .customer-message { background: #f0f8ff; padding: 15px; border-left: 4px solid #0078d4; font-style: italic; }
    .ai-suggestion { background: #fff9e6; padding: 15px; border-left: 4px solid #ffb900; }
    .action-needed { background: #ffe6e6; padding: 15px; border-left: 4px solid #d13438; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-header">
      <h1>Manual Review Required - Low Confidence Response</h1>
    </div>

    <div class="metadata">
      <div class="metadata-row">
        <div class="metadata-label">Ticket ID:</div>
        <div class="metadata-value"><strong>${ticketId}</strong></div>
      </div>
      <div class="metadata-row">
        <div class="metadata-label">Customer:</div>
        <div class="metadata-value">${customerEmail}</div>
      </div>
      <div class="metadata-row">
        <div class="metadata-label">Category:</div>
        <div class="metadata-value">${category}</div>
      </div>
      <div class="metadata-row">
        <div class="metadata-label">Priority:</div>
        <div class="metadata-value"><span class="priority-badge">${priority}</span></div>
      </div>
      <div class="metadata-row">
        <div class="metadata-label">AI Confidence:</div>
        <div class="metadata-value"><span class="confidence-low">${(confidence * 100).toFixed(0)}% (Below 70% threshold)</span></div>
      </div>
    </div>

    <div class="section">
      <h2>📧 Original Customer Message</h2>
      <div class="customer-message">${originalMessage.replace(/\n/g, '<br>')}</div>
    </div>

    <div class="section">
      <h2>🤖 AI Suggested Response (Not Sent)</h2>
      <div class="ai-suggestion">
        ${htmlAiResponse}
      </div>
    </div>

    <div class="action-needed">
      <strong>Action Required:</strong> Please review this ticket and provide a personalized response to ${customerEmail}.
      The AI-generated response above is provided for reference but was not sent due to low confidence.
    </div>
  </div>
</body>
</html>
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
