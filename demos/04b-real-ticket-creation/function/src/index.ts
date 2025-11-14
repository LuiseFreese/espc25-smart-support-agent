import { app } from '@azure/functions';
import { ProcessSupportEmail } from './functions/ProcessSupportEmail';
import { GraphWebhook } from './functions/GraphWebhook';
import { ManageSubscription } from './functions/ManageSubscription';
// DISABLED: Timer trigger causes infinite loop - replies create new emails
// import { CheckMailboxTimer } from './functions/CheckMailboxTimer';
import './functions/PingStorage';  // Auto-registers via app.http()

// Event-driven email processing via Microsoft Graph webhooks
app.http('GraphWebhook', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',  // Microsoft Graph validation requires public endpoint
  handler: GraphWebhook
});

app.http('ManageSubscription', {
  methods: ['GET', 'POST', 'DELETE'],
  authLevel: 'function',
  handler: ManageSubscription
});

app.http('ProcessSupportEmail', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  handler: ProcessSupportEmail
});

// DISABLED: Use Graph webhook subscription instead of polling timer
// app.timer('CheckMailboxTimer', {
//   schedule: '0 */5 * * * *',  // Every 5 minutes
//   handler: CheckMailboxTimer
// });
