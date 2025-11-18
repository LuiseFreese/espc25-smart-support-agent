import { app } from '@azure/functions';
import { ProcessSupportEmail } from './functions/ProcessSupportEmail';
import { GraphWebhook } from './functions/GraphWebhook';
import { ManageSubscription } from './functions/ManageSubscription';
import { triage } from './functions/triage';
import { answer } from './functions/answer';
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

// Demo 05: Copilot Studio Plugin endpoints
app.http('triage', {
  methods: ['POST'],
  authLevel: 'function',  // Requires function key for API access
  handler: triage
});

app.http('answer', {
  methods: ['POST'],
  authLevel: 'function',
  handler: answer
});

// DISABLED: Use Graph webhook subscription instead of polling timer
// app.timer('CheckMailboxTimer', {
//   schedule: '0 */5 * * * *',  // Every 5 minutes
//   handler: CheckMailboxTimer
// });
