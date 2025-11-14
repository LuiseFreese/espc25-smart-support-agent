# Smart Support Agent - Complete Demo Guide

**Azure AI Foundry-Powered Autonomous Email Support System**

---

## 1. Use Case: Automating Support Ticket Resolution

### The Business Problem

Traditional IT support teams face challenges:
- **High volume** of repetitive support requests (password resets, VPN issues, billing questions)
- **Slow response times** due to manual triage and routing
- **Inconsistent answers** from different support agents
- **Escalation delays** when knowledge base lookup is manual
- **Expensive scaling** - hiring more agents for peak loads

### The Solution

An **AI-powered autonomous support agent** that:

✅ **Monitors email inbox** in real-time via Microsoft Graph webhooks  
✅ **Classifies tickets** automatically (Network, Access, Billing, Software)  
✅ **Searches knowledge base** using Azure AI Search with semantic ranking  
✅ **Auto-resolves high-confidence tickets** by replying directly to customers  
✅ **Escalates low-confidence tickets** to human support agents  
✅ **Tracks everything** in Azure Table Storage for analytics

### Business Impact

- **60-80% ticket auto-resolution** for common issues
- **Instant response** (< 10 seconds from email arrival to resolution)
- **24/7 availability** without additional staff
- **Consistent quality** - answers always based on approved KB content
- **Scalable** - handles spikes without degradation

### Target Scenarios

| Category | Example Request | Expected Outcome |
|----------|----------------|------------------|
| **Network** | "VPN keeps disconnecting" | Auto-reply with troubleshooting steps |
| **Access** | "Forgot my password" | Auto-reply with reset instructions |
| **Billing** | "Update payment method for invoice" | Auto-reply with secure payment link |
| **Software** | "How to install Office 365?" | Auto-reply with installation guide |
| **Other** | Complex/ambiguous requests | Forward to human support team |

---

## 2. Architecture: Components & Data Flow

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER SENDS EMAIL                         │
│                 (to: AdeleV@hscluise.onmicrosoft.com)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               MICROSOFT GRAPH WEBHOOK                           │
│  (Instant notification when email arrives in inbox)             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          AZURE FUNCTION: GraphWebhook                           │
│  1. Validate webhook request                                    │
│  2. Check if email is from support address (skip loop)          │
│  3. Check if already processed (dedupe via EmailMessageId)      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          TRIAGE: Keyword-Based Classification                   │
│  Category: Network, Access, Billing, Software, Other            │
│  Priority: High, Medium, Low (based on urgency keywords)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          AZURE FUNCTION: RAG Search (Python)                    │
│  1. Generate embeddings from email body                         │
│  2. Search Azure AI Search index (kb-support)                   │
│  3. Use SEMANTIC RANKING for relevance scoring                  │
│  4. Calculate confidence (0.1-0.9 based on reranker scores)     │
│  5. Generate answer from top documents                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          DECISION: Confidence Threshold Check                   │
│                                                                 │
│  IF confidence >= 0.7 (HIGH)  │  IF confidence < 0.7 (LOW)      │
│  ├─ Auto-reply to customer    │  ├─ Forward to support team    │
│  ├─ Status: "AI Resolved -    │  ├─ Status: "Needs Human       │
│  │          Awaiting Confirm" │  │          Review"             │
│  └─ Mark email as read        │  └─ Include AI suggestion      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          AZURE TABLE STORAGE: SupportTickets                    │
│  Store ticket with:                                             │
│  - Unique ID (TKT-YYYYMMDD-XXXXXX)                             │
│  - Category, Priority, Status                                   │
│  - Confidence score, AI response                                │
│  - Customer email, subject, body                                │
│  - Timestamp, EmailMessageId (for deduplication)               │
└─────────────────────────────────────────────────────────────────┘
```

### Azure Resources (Sweden Central)

| Resource | Name | Purpose |
|----------|------|---------|
| **Resource Group** | `rg-smart-agents-dev` | Contains all resources |
| **Azure OpenAI** | `oai-agents-dw7z4hg4ssn2k` | GPT-4o-mini (triage), text-embedding-3-large (RAG) |
| **Azure AI Search** | `srch-agents-dw7z4hg4ssn2k` | Knowledge base index (10 documents), Semantic tier STANDARD |
| **Function App (Email)** | `func-agents-dw7z4hg4ssn2k` | Node.js 20 - GraphWebhook, ProcessSupportEmail, ManageSubscription |
| **Function App (RAG)** | `func-rag-dw7z4hg4ssn2k` | Python 3.11 - RAG search with semantic ranking |
| **Storage Account** | `stagentsdw7z4hg4ssn2k` | Table Storage (SupportTickets), Blob Storage (function code) |
| **App Insights** | `appi-smart-agents-dw7z4hg4ssn2k` | Monitoring, logging, correlation IDs |
| **Key Vault** | `kv-agents-dw7z4hg4ssn2k` | Secrets management |
| **AI Hub** | `aihub-agents-dw7z4hg4ssn2k` | AI Foundry workspace |
| **AI Project** | `aiproject-agents-dw7z4hg4ssn2k` | AI Foundry project |

### Key Technical Decisions

1. **Event-Driven Architecture**: Microsoft Graph webhooks eliminate polling delays (instant processing vs 5-minute timer)
2. **Semantic Ranking**: Azure AI Search STANDARD tier enables reranker scores (0-4 scale) for accurate confidence calculation
3. **Separate RAG Function**: Python function handles embeddings/search; TypeScript function handles email/workflow
4. **Table Storage**: Simple, cost-effective persistence for tickets (vs Cosmos DB for this scale)
5. **Keyword-Based Triage**: Fast, deterministic classification (vs LLM-based for cost control)

---

## 3. Workflow: Step-by-Step Processing

### Complete Email-to-Resolution Flow

#### Step 1: Email Arrival & Webhook Trigger
```
Customer → Sends email to AdeleV@hscluise.onmicrosoft.com
Microsoft 365 → Email arrives in inbox
Microsoft Graph → Sends webhook notification to Azure Function
Duration: < 1 second
```

#### Step 2: Webhook Validation & Deduplication
```typescript
// GraphWebhook function validates:
1. Webhook validation token (Microsoft Graph security)
2. Self-email filter: Skip if from AdeleV@hscluise.onmicrosoft.com
3. Duplicate check: Skip if EmailMessageId already in Table Storage
```

#### Step 3: Keyword-Based Triage
```typescript
// AIService.ts - keywordBasedTriage()
Category Detection:
  - "password|login|access|cant sign in" → Access
  - "vpn|network|connection|disconnect" → Network
  - "billing|charge|payment|invoice" → Billing
  - "software|application|program|app" → Software
  - Default → Other

Priority Detection:
  - "urgent|critical|asap|emergency|down" → High
  - "low priority|when you can|no rush" → Low
  - Default → Medium
```

#### Step 4: RAG Search with Semantic Ranking
```python
# Python RAG function - function_app.py
1. Generate embeddings from email body (text-embedding-3-large)
2. Search Azure AI Search index with query_type="semantic"
3. Retrieve @search.reranker_score (0-4 scale) from results
4. Calculate confidence:
   - score >= 3.5 → confidence = 0.9
   - score >= 3.0 → confidence = 0.8
   - score >= 2.0 → confidence = 0.6
   - score >= 1.0 → confidence = 0.4
   - score < 1.0 → confidence = 0.2
5. Generate answer from top 5 documents using GPT-4o-mini
```

#### Step 5: Confidence-Based Routing

**High Confidence (≥ 0.7):**
```typescript
// Auto-resolve path
1. Send reply to customer with AI-generated answer
2. Create ticket with status "AI Resolved - Awaiting Confirmation"
3. Mark email as read
4. Log success to Application Insights

Customer receives instant resolution!
```

**Low Confidence (< 0.7):**
```typescript
// Human review path
1. Forward email to support team (or customer if no team email set)
2. Include original question + AI suggestion (for reference)
3. Create ticket with status "Needs Human Review"
4. Mark email as read
5. Log for human follow-up

Support team handles manually.
```

#### Step 6: Ticket Persistence
```typescript
// TableStorageService.ts
Store in Azure Table Storage:
{
  PartitionKey: "SupportTicket",
  RowKey: "YYYYMMDD-XXXXXX", // Unique 6-char random suffix
  TicketId: "TKT-YYYYMMDD-XXXXXX",
  Category: "Network",
  Priority: "Medium",
  Status: "AI Resolved - Awaiting Confirmation",
  Confidence: 0.8,
  CustomerEmail: "customer@example.com",
  Subject: "VPN keeps disconnecting",
  Description: "Email body...",
  AIResponse: "If your VPN keeps disconnecting...",
  EmailMessageId: "AAMkAGI2..." // For deduplication
}
```

### Performance Metrics

- **Total Processing Time**: 5-10 seconds (email arrival → auto-reply sent)
- **Triage**: < 100ms (keyword matching)
- **RAG Search**: 2-4 seconds (embedding + semantic search + LLM answer)
- **Email Operations**: 1-2 seconds (Graph API send/mark read)
- **Storage**: < 500ms (Table Storage write)

---

## 4. How to Demo: Live Demonstration Script

### Pre-Demo Setup Checklist

✅ **Webhook Active**: Verify subscription exists
```powershell
$functionKey = "YOUR_FUNCTION_KEY_HERE"
Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription" `
  -Method Get -Headers @{ "x-functions-key" = $functionKey }
```
Expected: 1 active subscription for `AdeleV@hscluise.onmicrosoft.com`, expires in 3 days

✅ **Knowledge Base**: Verify 10 documents indexed
```powershell
# Check Azure Portal → srch-agents-dw7z4hg4ssn2k → Indexes → kb-support
# Should show 10 documents with embeddings
```

✅ **Email Access**: Confirm you can send to `AdeleV@hscluise.onmicrosoft.com`

✅ **Monitoring Ready**: Open Application Insights Live Metrics
```
Azure Portal → appi-smart-agents-dw7z4hg4ssn2k → Live Metrics
```

---

### Demo Scenario 1: High-Confidence Auto-Resolution (VPN Issue)

**Narrative**: "Let me show you how the system handles a common IT support request - a VPN connection issue."

#### Step 1: Send Email
```
TO: AdeleV@hscluise.onmicrosoft.com
SUBJECT: VPN keeps disconnecting - cannot work from home
BODY:
Hi Support,

I'm having issues with the VPN - it keeps disconnecting every 5 minutes. 
This is making it impossible to work from home today.

I've already tried restarting my computer and the VPN client, but the 
problem persists.

Can someone help?

Thanks,
Sarah Johnson
```

**Point Out**: "Notice this is a typical support request - user describes a problem with enough detail for troubleshooting."

#### Step 2: Watch Real-Time Processing
```powershell
# Open Application Insights Live Metrics
# Show webhook firing within 1-2 seconds of email arrival
```

**Narrate**: 
- "Microsoft Graph webhook fires instantly - no polling delay"
- "GraphWebhook function validates the request"
- "Triage detects 'vpn' and 'disconnect' keywords → Category: Network"
- "RAG search queries knowledge base with semantic ranking"

#### Step 3: Show Auto-Reply
**Check inbox** (should arrive within 10 seconds):

```
FROM: AdeleV@hscluise.onmicrosoft.com
TO: [Your email]
SUBJECT: Re: VPN keeps disconnecting - cannot work from home
BODY:
Thank you for contacting support. We've received your request and created 
ticket TKT-20251114-XXXXXX.

If your VPN keeps disconnecting every few minutes, try the following solutions:

1. **Check Internet Connection Stability**: 
   - Test your internet speed at https://speedtest.net.
   - Look for packet loss or high latency...

2. **Update VPN Client**: 
   - Check your current version under Help > About...

[Full troubleshooting steps from KB document]

This ticket has been marked as resolved. Please reply if you need further 
assistance.

Best regards,
Automated Support Agent
```

**Highlight**:
- ✅ Response sent in < 10 seconds
- ✅ Comprehensive answer from knowledge base
- ✅ Ticket ID for tracking
- ✅ Professional, helpful tone

#### Step 4: Verify Ticket in Table Storage
```powershell
az storage entity query --account-name stagentsdw7z4hg4ssn2k `
  --table-name SupportTickets --num-results 1
```

**Show**:
```json
{
  "TicketId": "TKT-20251114-XXXXXX",
  "Category": "Network",
  "Priority": "Medium",
  "Status": "AI Resolved - Awaiting Confirmation",
  "Confidence": 0.8,
  "AIResponse": "If your VPN keeps disconnecting..."
}
```

**Key Message**: "The system auto-resolved this ticket with 80% confidence. Customer got instant help, no human intervention needed."

---

### Demo Scenario 2: Low-Confidence Escalation (Complex Request)

**Narrative**: "Now let's see what happens when the AI isn't confident enough to auto-resolve."

#### Step 1: Send Ambiguous Email
```
TO: AdeleV@hscluise.onmicrosoft.com
SUBJECT: Need help with something
BODY:
Hey,

I'm having trouble with the thing we discussed yesterday. Can you fix it?

Thanks
```

**Point Out**: "Vague, lacks context - typical of emails that need human review."

#### Step 2: Watch Processing
**Narrate**:
- "Webhook fires, triage runs"
- "Category: Other (no clear keywords match)"
- "RAG search returns low confidence (< 0.7) - not enough context"

#### Step 3: Show Escalation Email
**Check support team inbox** (or customer inbox if SUPPORT_TEAM_EMAIL not set):

```
FROM: AdeleV@hscluise.onmicrosoft.com
SUBJECT: [Support Review Needed] Need help with something (TKT-20251114-YYYYYY)
BODY:
A support ticket requires human review.

Ticket ID: TKT-20251114-YYYYYY
Category: Other
Priority: Medium
Confidence: 0.3

Original Email:
FROM: [customer email]
SUBJECT: Need help with something
---
Hey,

I'm having trouble with the thing we discussed yesterday. Can you fix it?

Thanks
---

AI Suggestion (for reference):
[Low-confidence answer]

Please handle this ticket manually.
```

**Highlight**:
- ⚠️ Forwarded to human support team
- ⚠️ Includes all context + AI suggestion
- ⚠️ Ticket marked "Needs Human Review"

**Key Message**: "The AI knows its limits. When confidence is low, it escalates to humans rather than risk giving wrong information."

---

### Demo Scenario 3: High-Confidence with Specific KB Match (Invoice Payment)

**Narrative**: "Let's test a scenario where we recently added specific KB content to improve confidence."

#### Step 1: Send Invoice Payment Question
```
TO: AdeleV@hscluise.onmicrosoft.com
SUBJECT: Question about November invoice payment method
BODY:
Dear Support Team,

I need to update our payment method for the November invoice. Our corporate 
credit card was recently renewed with a new expiration date and CVV.

Invoice #: INV-2025-11-045
Amount: $2,499.00
Current card ending in: 4532

Can you send me a secure link to update the payment information?

Best regards,
Patricia Williams
Accounts Payable
```

#### Step 2: Show High Confidence Result
**Auto-reply received**:

```
Confidence: 0.9 (90%!)
Category: Billing

Response:
To receive a secure payment link, please email support at billing@example.com 
and include your invoice number (INV-2025-11-045). They will send you a 
secure payment link within 24 hours, which will expire after 7 days for 
security.

To update your payment method directly:
1. Go to https://billing.example.com
2. Navigate to "Payment Methods"
3. Click "Add New Payment Method"
...
```

**Explain Confidence Boost**:
- "Originally this would have been 60% confidence (low)"
- "We added a specific KB document about invoice payments"
- "Now it's 90% confidence - system learned from new content"
- "Shows how easy it is to improve performance by adding targeted KB docs"

---

### Demo Best Practices

**Timing**:
- ⏱️ Allow 10-15 seconds between email send and checking results
- ⏱️ Have Application Insights Live Metrics open during demo
- ⏱️ Pre-stage browser tabs (Azure Portal, Outlook, PowerShell terminal)

**Troubleshooting Live Issues**:
- If webhook expired: Run `POST /api/managesubscription` to recreate
- If duplicates: Check for multiple subscriptions with `GET /api/managesubscription`
- If no response: Manually trigger with `GET /api/processsupportemail`

**Audience Engagement**:
- Ask: "How long do your current support tickets take to resolve?"
- Ask: "What percentage of your tickets are repetitive questions?"
- Demo both success (auto-resolve) and escalation (human review) paths
- Show confidence score transparency - explain why decisions were made

**Key Metrics to Highlight**:
- ⚡ **< 10 seconds** end-to-end processing time
- 🎯 **70-90% confidence** on well-documented scenarios
- 📊 **60-80% auto-resolution rate** (estimated based on KB coverage)
- 💰 **Cost per ticket**: Pennies (Azure AI Search + OpenAI API calls)

---

## Quick Reference Commands

### Check Webhook Status
```powershell
$key = "YOUR_FUNCTION_KEY_HERE"
Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription" `
  -Method Get -Headers @{ "x-functions-key" = $key }
```

### Create New Webhook Subscription
```powershell
Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription" `
  -Method Post -Headers @{ "x-functions-key" = $key }
```

### View Recent Tickets
```powershell
az storage entity query --account-name stagentsdw7z4hg4ssn2k `
  --table-name SupportTickets --num-results 10
```

### Test RAG Function Directly
```powershell
$ragKey = "YOUR_RAG_FUNCTION_KEY_HERE"
$body = @{ question = "My VPN keeps disconnecting" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://func-rag-dw7z4hg4ssn2k.azurewebsites.net/api/rag-search" `
  -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-functions-key" = $ragKey }
```

### Check Application Insights Logs
```powershell
az monitor app-insights query --app appi-smart-agents-dw7z4hg4ssn2k `
  --resource-group rg-smart-agents-dev `
  --analytics-query "traces | where timestamp > ago(10m) | order by timestamp desc"
```

---

## Appendix: Knowledge Base Content

Current KB documents (10 total):

1. **account-access-guide.md** - Account access and authentication
2. **account-lockout-guide.md** - Account lockout resolution
3. **billing-guide.md** - General billing and payments
4. **email-and-calendar.md** - Email and calendar support
5. **invoice-payment.md** - ✨ Invoice payment updates (high confidence)
6. **password-recovery-detailed.md** - Comprehensive password recovery
7. **password-reset.md** - Quick password reset
8. **software-installation-guide.md** - Software installation and updates
9. **vpn-comprehensive-guide.md** - ✨ Complete VPN troubleshooting (high confidence)
10. **vpn-troubleshooting.md** - Quick VPN guide

### Adding New KB Content

To improve confidence for specific scenarios:

1. Create markdown file in `demos/02-rag-search/content/`
2. Use similar language to what users will write in emails
3. Include specific examples (invoice numbers, error messages, etc.)
4. Run ingestion script:
   ```bash
   cd demos/02-rag-search
   python ingest-kb.py
   ```
5. Test with real email to verify confidence increase

---

**Last Updated**: November 14, 2025  
**System Status**: ✅ Production-Ready (Sweden Central)  
**Support Email**: AdeleV@hscluise.onmicrosoft.com  
**Webhook Expiration**: Check with `GET /api/managesubscription` (renews every 3 days)


