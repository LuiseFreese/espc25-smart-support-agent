# Demo 04b: Real-Time Email Support Ticket Creation

**Production event-driven system** using Microsoft Graph webhooks, Azure Functions, and Azure Table Storage for automated support ticket processing.

## Quick Start

**Deploy to Azure:**

1. Ensure you're in the correct Azure tenant:
   ```powershell
   az login --tenant b469e370-d6a6-45b5-928e-856ae0307a6d
   ```

2. Build and deploy the function:
   ```powershell
   cd demos/04b-real-ticket-creation/function
   npm install
   npm run build
   func azure functionapp publish func-agents-dw7z4hg4ssn2k
   ```

3. Verify deployment:
   ```powershell
   Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/pingstorage"
   ```

## Architecture

```
New Email Arrives
        ↓
Microsoft Graph Webhook (instant notification)
        ↓
GraphWebhook Function (validates & deduplicates)
        ↓
Keyword-Based Triage (Category + Priority)
        ↓
RAG Search Function (Python - semantic ranking)
        ↓
Calculate Confidence (0.1-0.9 based on reranker scores)
        ↓
Create Ticket in Table Storage
        ↓
High Confidence (≥0.7)?
  ├─ Yes → Auto-reply to customer
  └─ No → Forward to support team
```

## Production Components

### 1. GraphWebhook Function
- **Trigger**: HTTP POST from Microsoft Graph
- **Auth Level**: Anonymous (required for Graph validation)
- **Purpose**: Real-time email processing when new email arrives
- **Features**:
  - Validates webhook requests (clientState check)
  - Prevents infinite loops (skips self-emails)
  - Deduplicates using EmailMessageId in Table Storage

### 2. ManageSubscription Function  
- **Trigger**: HTTP GET/POST
- **Auth Level**: Function key required
- **Purpose**: Create/renew/list Microsoft Graph webhook subscriptions
- **Note**: Subscriptions expire after 3 days, must be renewed

### 3. ProcessSupportEmail Function
- **Trigger**: HTTP GET/POST
- **Auth Level**: Function key required
- **Purpose**: Manual processing of unread emails (bypasses webhook)
- **Use Case**: Batch processing or webhook troubleshooting

### 4. PingStorage Function
- **Trigger**: HTTP GET
- **Auth Level**: Anonymous
- **Purpose**: Health check - verifies Table Storage connectivity

### 5. CheckMailboxTimer Function
- **Status**: DISABLED (caused infinite loops)
- **Replaced By**: Event-driven GraphWebhook approach

## AI Integration

### Triage (Keyword-Based)
Currently uses keyword matching in `AIService.ts`:
- **Categories**: Network, Access, Billing, Software, Other
- **Priorities**: High, Medium, Low
- **Accuracy**: 100% on test scenarios

### RAG Search (Python Function)
- **Endpoint**: `func-rag-dw7z4hg4ssn2k.azurewebsites.net/api/rag-search`
- **Features**: 
  - Semantic search via Azure AI Search
  - Score-based confidence calculation (0.1-0.9)
  - Uses STANDARD tier semantic ranking
- **Confidence Mapping**:
  - score ≥3.5 → 0.9 confidence
  - score ≥3.0 → 0.8 confidence  
  - score ≥2.0 → 0.6 confidence
  - score ≥1.0 → 0.4 confidence
  - score <1.0 → 0.2 confidence

## Graph API Integration

### Required Permissions (Application-level)
- `Mail.Read` - Read emails from monitored mailbox
- `Mail.Send` - Send auto-reply emails
- `User.Read.All` - Access user information

### Monitored Mailbox
- **Email**: AdeleV@hscluise.onmicrosoft.com
- **Webhook**: Instant notifications on new email arrival
- **Subscription Renewal**: Required every 3 days

## Table Storage Schema

### SupportTickets Table
- **Partition Key**: `TICKET` (all tickets in same partition)
- **Row Key**: `TKT-YYYYMMDD-XXXXXX` (unique ticket ID)
- **Fields**:
  - `TicketID`: Display ID (same as row key)
  - `Title`: Email subject
  - `Description`: Email body content
  - `CustomerEmail`: From address
  - `Category`: Network, Access, Billing, Software, Other
  - `Priority`: High, Medium, Low
  - `Status`: New, AI Resolved - Awaiting Confirmation, Needs Human Review
  - `AIResponse`: Generated answer from RAG
  - `Confidence`: 0.1-0.9 (determines auto-resolve vs escalation)
  - `EmailMessageId`: Microsoft Graph message ID (for deduplication)
  - `Timestamp`: Creation date/time

## Deployment

### Prerequisites
- Azure Storage Account (created via Bicep infrastructure)
- App Registration with Graph API permissions (admin consented)
- Function App deployed to Sweden Central

### Deploy Function Code
```bash
cd demos/04b-real-ticket-creation/function
npm install
npm run build
func azure functionapp publish func-agents-dw7z4hg4ssn2k
```

### Required Environment Variables

Configured in Function App Settings:
```
GRAPH_CLIENT_ID=196247e7-0fda-4e17-ad3c-cd71679f76b7
GRAPH_CLIENT_SECRET=<from-key-vault>
GRAPH_TENANT_ID=b469e370-d6a6-45b5-928e-856ae0307a6d
SUPPORT_EMAIL_ADDRESS=AdeleV@hscluise.onmicrosoft.com
STORAGE_ACCOUNT_NAME=stagentsdw7z4hg4ssn2k
STORAGE_ACCOUNT_KEY=<auto-configured-via-bicep>
RAG_ENDPOINT=https://func-rag-dw7z4hg4ssn2k.azurewebsites.net/api/rag-search
RAG_API_KEY=<function-key>
```

## Testing

### Test Production Webhook
Send email to: `AdeleV@hscluise.onmicrosoft.com`

Expected flow:
1. Email arrives in mailbox
2. Graph webhook triggers instantly
3. GraphWebhook function processes email
4. Ticket created in Table Storage
5. Auto-reply sent (if confidence ≥0.7) or forwarded to support team

### Check Webhook Status
```powershell
$functionKey = "YOUR_FUNCTION_KEY_HERE"
Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/managesubscription" `
  -Method Get -Headers @{ "x-functions-key" = $functionKey }
```

### Manual Email Processing (Bypass Webhook)
```powershell
Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail" `
  -Method Get -Headers @{ "x-functions-key" = $functionKey }
```

### Verify Table Storage
Azure Portal → Storage Account → Tables → SupportTickets

Or use PowerShell test scripts:
- `tests/e2e-test.ps1` - Full 3-scenario validation
- `tests/quick-test.ps1` - Single VPN test

## Local Development

```bash
# Copy settings template
cp local.settings.json.example local.settings.json

# Add credentials to local.settings.json
# (Graph secrets, Storage keys, RAG endpoint)

# Start function locally
npm install
npm run build
func start

# Test locally
curl http://localhost:7071/api/pingstorage
```

## Key Files

- `src/functions/GraphWebhook.ts` - **Main**: Real-time email webhook handler
- `src/functions/ManageSubscription.ts` - Webhook subscription manager
- `src/functions/ProcessSupportEmail.ts` - Manual batch processing
- `src/functions/PingStorage.ts` - Health check endpoint
- `src/services/AIService.ts` - Triage (keyword) + RAG calls
- `src/services/GraphService.ts` - Email CRUD operations
- `src/services/TableStorageService.ts` - Ticket persistence + deduplication
- `src/models/Ticket.ts` - TypeScript interfaces

## Monitoring

Application Insights queries:
```kql
// Recent email processing
traces
| where operation_Name == "GraphWebhook"
| order by timestamp desc
| take 50

// Tickets created
customEvents
| where name == "TicketCreated"
| project timestamp, ticketId=tostring(customDimensions.ticketId), 
          category=tostring(customDimensions.category),
          confidence=todouble(customDimensions.confidence)
```

