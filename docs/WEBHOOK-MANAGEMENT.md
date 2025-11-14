# Microsoft Graph Webhook Management Guide

## Overview

The system uses Microsoft Graph Change Notifications (webhooks) for **real-time, event-driven email processing**. When an email arrives at `AdeleV@hscluise.onmicrosoft.com`, Microsoft Graph immediately sends a notification to the `GraphWebhook` Azure Function, which processes it within seconds.

## Architecture

```
New Email → Microsoft Graph detects → Webhook notification → GraphWebhook function → 
  Skip self-emails → Check duplicates → Triage → RAG → Create ticket → Reply/Forward
```

**Key Advantage:** No polling delays, no infinite loops, instant processing.

## Webhook Endpoints

### GraphWebhook (Event Processor)
- **URL:** `https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/graphwebhook`
- **Method:** GET (validation), POST (notifications)
- **Auth:** Anonymous (required for Microsoft Graph validation)
- **Purpose:** Receives and processes email change notifications

### ManageSubscription (Subscription Manager)
- **URL:** `https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription`
- **Method:** GET (list), POST (create), DELETE (remove)
- **Auth:** Function key required
- **Purpose:** Create, renew, and manage webhook subscriptions

## Managing Subscriptions

### Check Current Subscription Status

```powershell
$functionKey = "<your-function-key>"
$result = Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription" `
  -Method Get `
  -Headers @{ "x-functions-key" = $functionKey }

$result | ConvertTo-Json
```

**Response:**
```json
{
  "count": 1,
  "subscriptions": [
    {
      "id": "dfb66a7c-f4f2-484c-913b-4abd23c230ce",
      "resource": "/users/AdeleV@hscluise.onmicrosoft.com/mailFolders/Inbox/messages",
      "changeType": "created",
      "expirationDateTime": "2025-11-15T16:50:25.492Z",
      "notificationUrl": "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/graphwebhook"
    }
  ]
}
```

### Create New Subscription

```powershell
$functionKey = "<your-function-key>"
$result = Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription" `
  -Method Post `
  -Headers @{ "x-functions-key" = $functionKey }

Write-Host "Subscription created! Expires: $($result.expirationDateTime)"
```

**When to use:**
- Initial setup
- After subscription expires (every 3 days)
- After webhook URL changes

### Delete Subscription

```powershell
$functionKey = "<your-function-key>"
$subscriptionId = "dfb66a7c-f4f2-484c-913b-4abd23c230ce"

Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription?id=$subscriptionId" `
  -Method Delete `
  -Headers @{ "x-functions-key" = $functionKey }
```

**When to use:**
- Before creating a new subscription (cleanup old ones)
- Troubleshooting duplicate notifications
- Decommissioning the system

## Subscription Lifecycle

### Expiration
- **Maximum Duration:** 3 days (4320 minutes)
- **Behavior on Expiration:** Notifications stop, emails not processed automatically
- **Renewal:** Create new subscription before expiration

### Renewal Strategy

**Option 1: Manual Renewal (Current)**
```powershell
# Run this every 2-3 days
.\scripts\renew-webhook-subscription.ps1
```

**Option 2: Automated Renewal (Recommended)**
- Create Azure Function Timer Trigger (runs daily)
- Check subscription expiration date
- Renew if < 24 hours remaining

Example timer code:
```typescript
// src/functions/RenewSubscription.ts
export async function RenewSubscription(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const client = createGraphClient();
  
  // Get all subscriptions
  const subs = await client.api('/subscriptions').get();
  
  for (const sub of subs.value) {
    const expiration = new Date(sub.expirationDateTime);
    const hoursRemaining = (expiration.getTime() - Date.now()) / (1000 * 60 * 60);
    
    if (hoursRemaining < 24) {
      // Renew subscription
      await client.api(`/subscriptions/${sub.id}`)
        .patch({
          expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        });
      context.log(`Renewed subscription ${sub.id}`);
    }
  }
}
```

## Troubleshooting

### Problem: Emails Not Processing Automatically

**Check:**
1. Subscription exists: `GET /api/managesubscription`
2. Subscription not expired: Check `expirationDateTime`
3. Webhook URL correct: Should match deployed function URL
4. Graph API permissions: Mail.Read, Mail.ReadWrite, Mail.Send

**Fix:**
```powershell
# Create new subscription
Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription" `
  -Method Post -Headers @{ "x-functions-key" = $functionKey }
```

### Problem: Duplicate Notifications

**Symptoms:** Same email processed multiple times  
**Cause:** Multiple active subscriptions

**Fix:**
```powershell
# List all subscriptions
$subs = Invoke-RestMethod -Uri ".../api/managesubscription" -Method Get -Headers @{ ... }

# Delete duplicates (keep newest)
foreach ($sub in $subs.subscriptions | Select-Object -SkipLast 1) {
  Invoke-RestMethod -Uri ".../api/managesubscription?id=$($sub.id)" -Method Delete -Headers @{ ... }
}
```

### Problem: Webhook Returns 401/403

**Cause:** GraphWebhook endpoint has wrong auth level  
**Expected:** `authLevel: 'anonymous'` (Microsoft Graph needs public validation)

**Verify in index.ts:**
```typescript
app.http('GraphWebhook', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',  // ← Must be anonymous
  handler: GraphWebhook
});
```

### Problem: Infinite Email Loops

**Symptoms:** Continuously receiving auto-replies  
**Cause:** Self-email filter disabled or broken

**Fix in GraphWebhook.ts:**
```typescript
const supportEmail = process.env.SUPPORT_EMAIL_ADDRESS?.toLowerCase();
const fromEmail = email.from.emailAddress.address.toLowerCase();

if (fromEmail === supportEmail) {
  context.log(`🛑 SKIPPING email from ourselves`);
  await graphService.markAsRead(messageId);
  continue;
}
```

## Monitoring

### Check Webhook Activity

```powershell
# Recent webhook calls
az monitor app-insights query \
  --app appi-smart-agents-dw7z4hg4ssn2k \
  --resource-group rg-smart-agents-dev \
  --analytics-query "requests | where name == 'GraphWebhook' | where timestamp > ago(1h) | order by timestamp desc"

# Webhook errors
az monitor app-insights query \
  --app appi-smart-agents-dw7z4hg4ssn2k \
  --resource-group rg-smart-agents-dev \
  --analytics-query "exceptions | where timestamp > ago(1h) | where operation_Name == 'GraphWebhook'"
```

### Subscription Health Check

```powershell
# Create scheduled check
$functionKey = "<key>"
$subs = Invoke-RestMethod -Uri ".../api/managesubscription" -Method Get -Headers @{ ... }

foreach ($sub in $subs.subscriptions) {
  $expiration = [datetime]$sub.expirationDateTime
  $hoursLeft = ($expiration - (Get-Date)).TotalHours
  
  if ($hoursLeft -lt 24) {
    Write-Warning "Subscription expires in $([Math]::Round($hoursLeft, 1)) hours!"
  } else {
    Write-Host "Subscription healthy: $([Math]::Round($hoursLeft, 1)) hours remaining" -ForegroundColor Green
  }
}
```

## Best Practices

1. **Monitor expiration daily** - Set calendar reminder for renewal
2. **Keep only one active subscription** - Delete old/duplicate subscriptions
3. **Log all webhook calls** - Use Application Insights for debugging
4. **Test after deployment** - Send test email after code changes
5. **Validate self-email filter** - Prevent infinite loops
6. **Secure function keys** - Store in Key Vault, rotate regularly

## Configuration

### Required Environment Variables

```
WEBHOOK_URL=https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/graphwebhook
WEBHOOK_CLIENT_STATE=SmartSupportAgent2025
SUPPORT_EMAIL_ADDRESS=AdeleV@hscluise.onmicrosoft.com
GRAPH_CLIENT_ID=<app-registration-id>
GRAPH_CLIENT_SECRET=<app-secret>
GRAPH_TENANT_ID=<tenant-id>
```

### Required Graph API Permissions

- `Mail.Read` - Read emails from mailbox
- `Mail.ReadWrite` - Mark emails as read
- `Mail.Send` - Send auto-replies and forwards

## References

- [Microsoft Graph Change Notifications](https://learn.microsoft.com/graph/webhooks)
- [Subscription Resource Type](https://learn.microsoft.com/graph/api/resources/subscription)
- [Create Subscription API](https://learn.microsoft.com/graph/api/subscription-post-subscriptions)
