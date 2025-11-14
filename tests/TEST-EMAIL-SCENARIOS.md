# Test Email Scenarios for Smart Support Agent

Send these emails to **AdeleV@hscluise.onmicrosoft.com** to test the webhook-based email processing system.

## Core Test Scenarios (Original 3)

### Scenario 1: VPN Connection Issue (Network/Medium)

**Subject:** VPN keeps disconnecting - cannot work from home

**Body:**
```
Hi Support,

I'm having issues with the VPN - it keeps disconnecting every 5 minutes. This is making it impossible to work from home today.

I've already tried restarting my computer and the VPN client, but the problem persists.

Can someone help?

Thanks,
Sarah Johnson
```

**Expected Results:**
- Category: Network
- Priority: Medium
- Confidence: 0.7-0.9 (should match VPN troubleshooting KB doc)

---

### Scenario 2: Password Reset Request (Access/Medium)

**Subject:** Need password reset for corporate account

**Body:**
```
Hello,

I forgot my password and need to reset it. I've tried the self-service portal but it's not working.

Can you please reset my password?

Username: mjones
Employee ID: 12345

Thanks,
Michael Jones
```

**Expected Results:**
- Category: Access
- Priority: Medium
- Confidence: 0.7-0.9 (should match password reset KB doc)

---

### Scenario 3: Invoice Payment Question (Billing/Medium)

**Subject:** Question about November invoice payment method

**Body:**
```
Dear Support Team,

I need to update our payment method for the November invoice. Our corporate credit card was recently renewed with a new expiration date and CVV.

Invoice #: INV-2025-11-045
Amount: $2,499.00
Current card ending in: 4532

Can you send me a secure link to update the payment information?

Best regards,
Patricia Williams
Accounts Payable
```

**Expected Results:**
- Category: Billing
- Priority: Medium
- Confidence: 0.5-0.7 (partial match to billing KB doc)

---

## How to Test

### Method 1: Real Email (RECOMMENDED)
Just send an email to `AdeleV@hscluise.onmicrosoft.com` with any of the subjects and bodies above. The webhook will process it **instantly** and you'll receive an auto-reply or manual review notification.

### Method 2: Manual Trigger
If the webhook isn't working, manually trigger processing:

```powershell
$functionKey = "YOUR_FUNCTION_KEY_HERE"
Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail" `
  -Method Get -Headers @{ "x-functions-key" = $functionKey }
```

### Method 3: Direct POST (Testing Only)
```powershell
$functionKey = "YOUR_FUNCTION_KEY_HERE"
$body = @{
    subject = "VPN keeps disconnecting"
    body = "I'm having VPN connection issues..."
    from = "test@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail" `
  -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-functions-key" = $functionKey }
```

---

## Verification

After sending test emails, verify tickets were created:

```powershell
# Check recent tickets
az storage entity query --account-name stagentsdw7z4hg4ssn2k --table-name SupportTickets --num-results 10

# Check webhook logs
az monitor app-insights query \
  --app appi-smart-agents-dw7z4hg4ssn2k \
  --resource-group rg-smart-agents-dev \
  --analytics-query "traces | where timestamp > ago(10m) | where message contains 'GraphWebhook' | order by timestamp desc"
```

---

## Expected System Behavior

1. **Email arrives** → Webhook triggered within seconds
2. **Self-email filter** → Skips if from `AdeleV@hscluise.onmicrosoft.com`
3. **Duplicate check** → Skips if EmailMessageId already processed
4. **Triage** → Keyword-based classification (Category + Priority)
5. **RAG search** → Knowledge base query with score-based confidence
6. **Ticket creation** → Stored in Table Storage with unique TKT-YYYYMMDD-XXXXXX ID
7. **Response:**
   - **High confidence (≥0.7)**: Auto-reply to customer
   - **Low confidence (<0.7)**: Forward to support team for manual review
8. **Mark as read** → Email marked as processed

---

## Troubleshooting

### No Auto-Reply Received
- Check webhook subscription: `GET /api/managesubscription`
- Verify subscription hasn't expired (3-day limit)
- Check Application Insights for errors

### Duplicate Tickets Created
- Multiple webhook subscriptions active (delete old ones)
- EmailMessageId deduplication not working

### Infinite Loop (Multiple Replies)
- Self-email filter broken (check `fromEmail === supportEmail` logic)
- Webhook processing our own replies

### All Confidence Scores Same
- RAG function not deployed with score-based algorithm
- Verify Python function has updated `function_app.py`

---

## See Also

- `ADDITIONAL-EMAIL-SCENARIOS.md` - 8 more test scenarios (Software, Access, Network, Other)
- `docs/WEBHOOK-MANAGEMENT.md` - Complete webhook subscription guide
- `.github/copilot-instructions.md` - Full project documentation

