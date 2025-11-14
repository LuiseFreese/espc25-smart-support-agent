import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Client } from '@microsoft/microsoft-graph-client';
import { createGraphClient } from '../lib/graphClient';

/**
 * Manages Microsoft Graph webhook subscriptions for email notifications
 *
 * Usage:
 * - POST to create new subscription
 * - GET to check subscription status
 * - DELETE to remove subscription
 *
 * Subscriptions expire after 3 days and need to be renewed
 */
export async function ManageSubscription(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const client = createGraphClient();
  const supportEmail = process.env.SUPPORT_EMAIL_ADDRESS;
  const webhookUrl = process.env.WEBHOOK_URL; // Your Azure Function URL for GraphWebhook

  if (!supportEmail) {
    return {
      status: 500,
      jsonBody: { error: 'SUPPORT_EMAIL_ADDRESS not configured' }
    };
  }

  if (!webhookUrl) {
    return {
      status: 500,
      jsonBody: { error: 'WEBHOOK_URL not configured. Set this to your GraphWebhook function URL' }
    };
  }

  try {
    if (request.method === 'POST') {
      // Create new subscription
      context.log('Creating new Graph subscription...');

      const subscription = {
        changeType: 'created',
        notificationUrl: webhookUrl,
        resource: `/users/${supportEmail}/mailFolders/Inbox/messages`,
        expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        clientState: process.env.WEBHOOK_CLIENT_STATE || 'AzureFunctionsWebhook'
      };

      const result = await client
        .api('/subscriptions')
        .post(subscription);

      context.log('✅ Subscription created:', result.id);

      return {
        status: 201,
        jsonBody: {
          message: 'Subscription created successfully',
          subscriptionId: result.id,
          expirationDateTime: result.expirationDateTime,
          resource: result.resource,
          notificationUrl: result.notificationUrl
        }
      };

    } else if (request.method === 'GET') {
      // List existing subscriptions
      context.log('Fetching subscriptions...');

      const subscriptions = await client
        .api('/subscriptions')
        .get();

      // Filter for our email subscriptions
      const emailSubs = subscriptions.value.filter((sub: any) =>
        sub.resource.includes(supportEmail || '')
      );

      return {
        status: 200,
        jsonBody: {
          count: emailSubs.length,
          subscriptions: emailSubs.map((sub: any) => ({
            id: sub.id,
            resource: sub.resource,
            changeType: sub.changeType,
            expirationDateTime: sub.expirationDateTime,
            notificationUrl: sub.notificationUrl
          }))
        }
      };

    } else if (request.method === 'DELETE') {
      // Delete subscription
      const subscriptionId = request.query.get('id');

      if (!subscriptionId) {
        return {
          status: 400,
          jsonBody: { error: 'Subscription ID required. Use ?id=<subscription-id>' }
        };
      }

      context.log(`Deleting subscription: ${subscriptionId}`);

      await client
        .api(`/subscriptions/${subscriptionId}`)
        .delete();

      return {
        status: 200,
        jsonBody: {
          message: 'Subscription deleted successfully',
          subscriptionId
        }
      };

    } else {
      return {
        status: 405,
        jsonBody: { error: 'Method not allowed. Use GET, POST, or DELETE' }
      };
    }

  } catch (error: any) {
    context.error('Subscription management failed:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to manage subscription',
        details: error.message || String(error),
        body: error.body ? JSON.parse(error.body) : undefined
      }
    };
  }
}
