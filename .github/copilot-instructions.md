# Azure AI Foundry Smart Support Agent - Copilot Instructions

## Project Overview

An **event-driven IT support automation system** that processes support emails, classifies them, searches a knowledge base, and automatically responds or escalates based on confidence scores.

### Progressive Demo Architecture (8 Demos)

1. **Demo 01: Triage** - Keyword-based classification (Network/Access/Billing/Software)
2. **Demo 02: RAG Search** - Knowledge base retrieval with confidence scoring
   - **Streaming Mode**: Optional real-time token-by-token response streaming via toggle
   - **Multi-Modal**: Optional image upload for visual analysis (GPT-5.1-chat vision capabilities)
3. **Demo 03: Agent Tools** - Function calling patterns for extensibility
4. **Demo 04: Production** - Complete email automation (MAIN PRODUCTION SYSTEM)
5. **Demo 05: Copilot Plugin** - Triage + RAG endpoints for Copilot Studio (deployed to func-agents)
6. **Demo 06: Agentic Retrieval** - Query planning, parallel search fanout, result merging with citations
7. **Demo 07: Multi-Agent Orchestration** - Local orchestrator with Triage/FAQ/RAG/Ticket agents
8. **Demo 08: Foundry Cloud Agent** - Azure AI Foundry hosted agent with cloud-based orchestration

**Tech Stack:** Azure AI Foundry • Azure OpenAI (GPT-5.1-chat, text-embedding-3-large) • Azure AI Search • Azure Functions (Node.js 20 + Python 3.11) • Table Storage • Application Insights • Azure Communication Services

**Region:** Sweden Central (required for GPT-5.1-chat model availability)

## Key Architecture Patterns

**Email Processing:**
- **Inbound:** Microsoft Graph webhooks (real-time, event-driven)
- **Outbound:** Azure Communication Services (compatible with all M365 tenants)
- **Deduplication:** EmailMessageId stored as Table Storage RowKey (prevents duplicate processing)

**AI Decision Pipeline:**
- **Step 1 - Triage:** Keyword matching → Category + Priority (fast, deterministic)
- **Step 2 - RAG Search:** Hybrid vector + semantic search → Answer + Confidence (0.1-0.95)
- **Step 3 - Route:** Confidence ≥0.7 = Auto-reply | <0.7 = Escalate to human

**Data & Storage:**
- **Tickets:** Table Storage with format `TKT-YYYYMMDD-XXXXXX` (PartitionKey='TICKET')
- **Knowledge Base:** 11 markdown docs → Azure AI Search index (1536-dim embeddings)

**Security:**
- **Production:** Managed Identity (no secrets) for Azure OpenAI, AI Search, Key Vault
- **External Services:** API keys for Microsoft Graph, Communication Services (stored in Key Vault)

**Infrastructure:**
- **IaC:** Bicep templates (subscription-level deployment)
- **Runtimes:** Node.js 20 (orchestration) + Python 3.11 (RAG endpoint)
    subgraph "Event-Driven Production Flow"
        A[New Email Arrives] -->|Real-time| B[Microsoft Graph<br/>Change Notification]
        B -->|Webhook POST| C[GraphWebhook<br/>Azure Function]
        C -->|1. Validate| D{From Support<br/>Address?}
        D -->|Yes| E[Skip - Prevent Loop]
        D -->|No| F[Check Duplicate]
        F -->|New| G[Keyword Triage]
        G -->|Category/Priority| H[RAG Search]
        H -->|Answer + Confidence| I[(Table Storage<br/>Create Ticket)]
        I -->|Confidence| J{High ≥0.7?}
        J -->|Yes| K[Auto-Reply<br/>to Customer]
        J -->|No| L[Forward to<br/>Support Team]
        K --> M[Mark as Read]
        L --> M
    end
    
    subgraph "Supporting Services"
        N[Azure AI Search<br/>KB Index]
        O[RAG Function<br/>Score-based Confidence]
        P[Application Insights<br/>Monitoring]
    end
    
    H -.->|Query| N
    H -.->|Response| O
    C -.->|Logs| P
    
    style C fill:#0078d4,color:#fff
    style G fill:#ffb900,color:#000
    style I fill:#50e6ff,color:#000
    style J fill:#107c10,color:#fff
    style D fill:#d13438,color:#fff
```

### Triage Classification Logic

The current keyword-based triage (in `AIService.ts`) scans email body for:

**Categories**:
- `password|login|access|cant sign in` → **Access**
- `vpn|network|connection|disconnect` → **Network**
- `billing|charge|payment|invoice` → **Billing**
- `software|application|program|app` → **Software**
- Default → **Other**

**Priorities**:
- `urgent|critical|asap|emergency|down` → **High**
- `low priority|when you can|no rush` → **Low**
- Default → **Medium**

**Test Results**: 100% accuracy on VPN, Password, Billing scenarios.

### RAG Confidence Scoring (How Auto-Reply Decisions Work)

The system decides whether to auto-reply or escalate based on **search quality scores**:

**How It Works:**
1. User question → Convert to 1536-dim embedding (text-embedding-3-large)
2. Azure AI Search performs **hybrid search** (vector + semantic ranking, k=50)
3. Top result gets a `@search.rerankerScore` (Azure's semantic ranker, range 0-4)
4. Score maps to confidence:
   - **3.0+** → 0.95 (excellent match - auto-reply)
   - **2.5-3.0** → 0.85 (strong match - auto-reply)
   - **2.0-2.5** → 0.75 (good match - auto-reply)
   - **1.5-2.0** → 0.60 (moderate - escalate to human)
   - **<1.5** → 0.30 (poor/fallback - escalate)

**Decision Threshold:** Confidence ≥0.7 triggers auto-reply

**Why This Matters:** Without proper RAG_API_KEY configuration, system returns 0.3 (fallback) and escalates everything.

**Implementation:** `demos/02-rag-search/rag-function/function_app.py` lines 80-150

## Repository Structure

```
demos/
├── 01-triage-promptflow/      # Keyword classification
├── 02-rag-search/              # Knowledge base + RAG search (with streaming toggle)
│   ├── content/                # 11 KB markdown docs
│   ├── ingest/                 # TypeScript ingestion (Azure SDK)
│   └── rag-function/           # Python HTTP endpoint (deployed)
├── 03-agent-with-tools/        # Function calling demo
├── 04-real-ticket-creation/    # Production email system (MAIN)
│   └── function/src/
│       ├── functions/          # Azure Functions endpoints
│       ├── services/           # Business logic (AIService, TableStorageService, etc.)
│       └── models/             # TypeScript types
├── 05-triage-plugin/           # Copilot Studio integration
├── 06-agentic-retrieval/       # Unified demo UI + Query planning + parallel search
│   └── src/
│       ├── App.tsx             # React UI with 5 demo tabs
│       ├── server-unified.ts   # Express backend serving all demo endpoints
│       ├── agenticRetrieval.ts # Main CLI entrypoint
│       ├── queryPlanning.ts    # LLM-based query decomposition
│       ├── searchFanout.ts     # Parallel Azure AI Search queries
│       └── mergeResults.ts     # Citation-based answer merging
└── 07-multi-agent-orchestration/ # Local multi-agent system
    └── src/
        ├── index.ts            # Orchestrator
        └── agents/
            ├── triageAgent.ts  # Intent classification
            ├── faqAgent.ts     # Hard-coded FAQ matching
            ├── ragAgent.ts     # Single-query RAG
            └── ticketAgent.ts  # Ticket creation

infra/
├── main.bicep              # Main infrastructure template
├── parameters.dev.json     # Environment config
└── modules/                # Individual resource modules

scripts/
├── deploy.ps1              # One-command deployment (MAIN)
├── setup-graph-webhook.ps1 # App registration + webhook creation
└── verify-deployment.ps1   # Health check

tests/                      # Test scenarios and scripts
docs/                       # Architecture documentation
```

## Coding Conventions

- **TypeScript:** Azure Functions v4 model, compile before deploy (`npm run build`)
- **Python:** RAG endpoint uses Azure SDK patterns (SearchClient, AzureOpenAI)
- **Auth Levels:** `'function'` for production (requires x-functions-key), `'anonymous'` for webhooks
- **Environment Variables:** `AZURE_*` or `GRAPH_*` prefix
- **Bicep:** Use `@secure()` for secrets, Managed Identity for service-to-service auth
- **Table Storage Keys:** PartitionKey always `'TICKET'`, RowKey is sanitized EmailMessageId or generated ID
- **RAG Search Pattern:** Hybrid search (vector + semantic) with k=50 for RRF fusion

### TypeScript Function Patterns

**Function Registration:** All Azure Functions must be registered in `src/index.ts` using Azure Functions v4 model:
```typescript
import { app } from '@azure/functions';
import { GraphWebhook } from './functions/GraphWebhook';

app.http('GraphWebhook', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous',  // Only for webhooks requiring external validation
  handler: GraphWebhook
});
```

**Service Architecture:** Business logic lives in `src/services/`, not in function handlers:
- `AIService.ts` - Triage classification + RAG search HTTP client
- `GraphService.ts` - Microsoft Graph API + Azure Communication Services
- `TableStorageService.ts` - Table Storage CRUD with deduplication logic

**Critical Deduplication Pattern:** EmailMessageId MUST be used as Table Storage RowKey to prevent duplicate processing:
```typescript
// In TableStorageService.ts
const rowKey = ticket.EmailMessageId 
  ? ticket.EmailMessageId.replace(/[^a-zA-Z0-9-]/g, '_')  // Sanitize for Table Storage
  : `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const entity = {
  partitionKey: 'TICKET',  // ALWAYS 'TICKET' - do not use dynamic partition keys
  rowKey: rowKey,
  EmailMessageId: ticket.EmailMessageId || ''
};
```

### Python RAG Function Patterns

**Azure SDK Authentication:** Prefer Managed Identity over API keys:
```python
# Try API key first (for local dev), fallback to Managed Identity
if openai_api_key:
    openai_client = AzureOpenAI(api_key=openai_api_key, ...)
else:
    credential = DefaultAzureCredential()
    token_provider = get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")
    openai_client = AzureOpenAI(azure_ad_token_provider=token_provider, ...)
```

**Semantic Search Score Mapping:** Critical for confidence-based routing (in `function_app.py` lines 80-150):
```python
# Semantic reranker score (0-4 range) maps to confidence
reranker_score = result.get("@search.reranker_score")  # Note: underscore, not camelCase!
if reranker_score is not None:
    if reranker_score >= 3.0: confidence = 0.95
    elif reranker_score >= 2.5: confidence = 0.85
    elif reranker_score >= 2.0: confidence = 0.75
    else: confidence = 0.60
```

**Hybrid Search Configuration:** Always use both vector and semantic ranking:
```python
results = search_client.search(
    search_text=question,
    vector_queries=[{
        "kind": "vector",
        "vector": question_embedding,
        "fields": "contentVector",
        "k": 50  # High k for better RRF fusion
    }],
    query_type="semantic",
    semantic_configuration_name="semantic-config",
    top=50
)
```

## Essential Commands

### Local Development

**TypeScript Functions (Demo 04 - Main System):**
```bash
# Setup
az login && az account set -s <subscription-id>
npm install -g typescript azure-functions-core-tools@4

# Build and run locally
cd demos/04-real-ticket-creation/function
npm install
npm run build
func start

# Deploy to Azure
func azure functionapp publish func-agents-<uniqueid>
```

**Python RAG Function (Demo 02 - Search Endpoint):**
```powershell
# Setup Python environment
cd demos/02-rag-search/rag-function
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Configure local settings
cp local.settings.json.example local.settings.json
# Edit local.settings.json with:
# - AZURE_AI_SEARCH_ENDPOINT
# - AZURE_AI_SEARCH_API_KEY
# - AZURE_OPENAI_ENDPOINT
# - AZURE_OPENAI_API_KEY (or use Managed Identity)

# Run locally
func start

# Test endpoint
curl -X POST http://localhost:7071/api/rag-search `
  -H "Content-Type: application/json" `
  -d '{"question": "How do I reset my password?"}'  

# Deploy to Azure
func azure functionapp publish func-rag-<uniqueid>
```

**Key Difference:** Python function uses Azure SDK patterns (SearchClient, AzureOpenAI client) vs TypeScript uses REST API calls

## Deployment

```powershell
# One-command deployment (RECOMMENDED - 15 minutes hands-off)
.\scripts\deploy.ps1 -SubscriptionId "<your-sub-id>" -SupportEmail "support@domain.com"
```

This script automatically:
1. Forces fresh Azure authentication (`az logout` then `az login`)
2. Validates prerequisites (Azure CLI, Node.js, Azure Functions Core Tools)
3. Purges soft-deleted Cognitive Services and Key Vaults
4. Deploys infrastructure with retry logic for transient failures
5. Links Communication Services domain
6. Ingests knowledge base (11 markdown docs → Azure AI Search)
7. Builds and deploys TypeScript function code
8. Builds and deploys Python RAG function
9. Creates Microsoft Graph app registration with Mail.Read/Mail.Send permissions
10. Auto-configures RAG_API_KEY (critical - prevents 0.3 fallback responses)
11. Creates webhook subscription (3-day expiration)
12. Verifies full deployment health

**Critical Post-Deployment:** The deploy script handles RAG_API_KEY configuration automatically. If deploying manually, you MUST run `setup-graph-webhook.ps1` or RAG will return 0.3 confidence (fallback) for all queries.

### Manual step-by-step:

# 1. Deploy infrastructure
cd infra
az deployment sub create \
  --location westeurope \
  --template-file main.bicep \
  --parameters @parameters.dev.json

# 2. Link Communication Services domain (REQUIRED)
cd ..\scripts
.\post-deploy-communication-services.ps1 -ResourceGroup rg-smart-agents-dev

# 3. Configure Graph webhook (auto-configures RAG_API_KEY!)
.\setup-graph-webhook.ps1 -ResourceGroup rg-smart-agents-dev -SupportEmail support@domain.com

# 4. Deploy function code
cd ..\demos\04-real-ticket-creation\function
npm install && npm run build
func azure functionapp publish func-agents-<uniqueid>

# 5. Verify deployment
cd ..\..\scripts
.\verify-deployment.ps1 -ResourceGroup rg-smart-agents-dev
```

## Common Development Tasks

| Task | Action |
|------|--------|
| Add new Azure Function | Create in `src/functions/`, register in `src/index.ts` |
| Update triage logic | Modify `AIService.ts` → `keywordBasedTriage()` |
| Add KB document | See "Knowledge Base Update Process" below |
| Update infrastructure | Modify `infra/modules/*.bicep`, redeploy with `az deployment sub create` |
| Renew webhook (expires 3 days) | POST to `/api/managesubscription` endpoint |
| Test demos locally | Use VS Code tasks: "Start Unified Demo UI" launches frontend + backend |
| Deploy single function | `cd demos/XX-name/function && npm run build && func azure functionapp publish func-name` |

### Demo UI Development (Demos 06-08)

**Unified Fluent UI:** Modern React app with real Microsoft Fluent UI components located in `demos-ui/`:
- **Frontend:** Vite + React + Fluent UI v9 (`demos-ui/frontend/`)
- **Backend:** Express.js serving all demo endpoints (`demos-ui/backend/src/server-unified.ts`)
- **Start Both:** Use VS Code task "Start Unified Demo UI" or manually:
  ```powershell
  # Terminal 1
  cd demos-ui/frontend && npm run dev
  
  # Terminal 2  
  cd demos-ui/backend && npm run dev
  ```

**Demo 06 Architecture (Agentic Retrieval):**
- `queryPlanning.ts` - LLM decomposes complex questions into 2-4 focused queries
- `searchFanout.ts` - Executes queries in parallel against Azure AI Search
- `mergeResults.ts` - Combines results with citation tracking
- **Pattern:** Plan → Parallel Search → Merge with Citations

**Demo 07 Architecture (Multi-Agent Orchestration):**
- `orchestrator.ts` - Routes queries to specialized agents based on intent
- `agents/triageAgent.ts` - Classifies user intent (FAQ, RAG, Ticket)
- `agents/faqAgent.ts` - Pattern matching for common questions
- `agents/ragAgent.ts` - Full RAG pipeline for knowledge base queries
- `agents/ticketAgent.ts` - Ticket creation workflow
- **Pattern:** Intent Classification → Specialized Agent → Coordinated Response

### Knowledge Base Update Process

To add or update support documentation:

1. **Add/Edit Markdown File:**
   ```powershell
   # Create new file in content directory
   cd demos/02-rag-search/content
   # Add your .md file (e.g., new-guide.md)
   ```

2. **Run Ingestion Script:**
   ```powershell
   cd demos/02-rag-search
   # Using Python script:
   python ingest-kb.py
   
   # OR using TypeScript ingestion tool:
   cd ingest
   npm install
   npm run dev
   ```

3. **What Happens:**
   - Script reads all .md files from `content/` directory
   - Chunks content into searchable segments
   - Generates 1536-dim embeddings via Azure OpenAI (text-embedding-3-large)
   - Uploads to Azure AI Search index `kb-support`
   - Creates vector index with semantic configuration

4. **Verify:**
   ```powershell
   # Test RAG search with your new content
   .\.\tests\test-demo02-rag.ps1
   ```

**Current KB:** 11 documents covering VPN, passwords, billing, software installation

## Testing & Verification

### Test Email Scenarios
Located in `sample-data/tickets/TEST-EMAIL-SCENARIOS.md`:
- **VPN Issue:** "My VPN keeps disconnecting every 5 minutes" → Category: Network, Priority: Medium
- **Password Reset:** "I can't log in, forgot my password" → Category: Access, Priority: Medium
- **Billing Query:** "Double charged on my last invoice" → Category: Billing, Priority: High

### Quick Health Checks
```powershell
# Verify full deployment
.\scripts\verify-deployment.ps1 -ResourceGroup rg-smart-agents-dev

# Check webhook status
curl https://func-agents-<id>.azurewebsites.net/api/managesubscription?code=<key>

# Test RAG endpoint directly
curl -X POST https://func-rag-<id>.azurewebsites.net/api/rag-search \
  -H "x-functions-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"question": "How to reset password?"}'

# Test storage connectivity
curl https://func-agents-<id>.azurewebsites.net/api/ping-storage
```

### Running Automated Tests
```powershell
# E2E test (requires deployed system)
.\tests\e2e-test.ps1

# Test RAG search (local or deployed)
.\tests\test-demo02-rag.ps1

# Check semantic search configuration
.\tests\check-semantic-search.ps1
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No email response received | 1. Check domain linked: `.\scripts\post-deploy-communication-services.ps1`<br>2. Check RAG_API_KEY configured: `az functionapp config appsettings list --name func-agents-<id> --query "[?name=='RAG_API_KEY']"`<br>3. View logs in Application Insights |
| RAG returns low confidence (0.3) | RAG_API_KEY missing or incorrect. Re-run `.\scripts\setup-graph-webhook.ps1` |
| "DomainNotLinked" error | Run `.\scripts\post-deploy-communication-services.ps1` to link email domain |
| Multiple duplicate emails | Verify EmailMessageId deduplication logic deployed (latest function code) |
| Webhook not processing emails | Check subscription status: GET `/api/managesubscription`, renew if expired |
| TypeScript errors | Run `npm run build` locally first |
| Missing environment variables | Check function app settings: `az functionapp config appsettings list` |

## Important Notes

- **Communication Services for Email:** System uses Azure Communication Services for email sending (not Graph API sendMail) to ensure compatibility with all M365 tenants
- **Domain Linking Required:** Communication Services domain must be linked via `post-deploy-communication-services.ps1` after Bicep deployment
- **RAG Authentication:** RAG_API_KEY must be configured or RAG returns fallback (0.3 confidence). Setup script now handles this automatically
- **Duplicate Prevention:** EmailMessageId used as Table Storage RowKey enforces uniqueness
- **Webhook Expiration:** Subscriptions expire every 3 days (must renew)
- **GraphWebhook Auth:** Uses `authLevel: 'anonymous'` (required for Microsoft Graph validation)
- **Other Endpoints:** Use `authLevel: 'function'` (requires function key)
- **Managed Identity:** Use for Azure resource access (no API keys)

### Email Processing Flow Deep Dive

**Webhook Lifecycle:**
1. **Validation:** Graph API calls webhook with `?validationToken=xxx` query parameter
2. **GraphWebhook Function:** Responds with plain text token (200 OK)
3. **Active Subscription:** Graph sends POST notifications for 3 days, then expires
4. **Renewal:** Call `/api/managesubscription` endpoint (POST creates, GET checks status)

**Change Notification Format:**
```json
{
  "value": [{
    "changeType": "created",
    "resource": "Users/{userId}/Messages/{messageId}"
  }]
}
```

**Processing Pipeline in GraphWebhook.ts:**
1. **Extract MessageId:** Parse from `resource` field using regex
2. **Fetch Full Email:** Call Graph API `getEmailById(messageId)`
3. **Loop Prevention:** Skip if `from.emailAddress` matches `SUPPORT_EMAIL_ADDRESS`
4. **Duplicate Check:** Query Table Storage by EmailMessageId (O(1) lookup via RowKey)
5. **Triage:** Keyword matching → Category + Priority
6. **RAG Search:** HTTP POST to Python function → Answer + Confidence
7. **Create Ticket:** Store in Table Storage with sanitized EmailMessageId as RowKey
8. **Route Decision:** 
   - Confidence ≥0.7: Send auto-reply via Communication Services
   - Confidence <0.7: Forward to support team via Graph API
9. **Mark as Read:** Call Graph API to update message status

**Why This Architecture:**
- **Deduplication:** EmailMessageId as RowKey = automatic duplicate prevention (Table Storage constraint)
- **Two Email Services:** Graph (read) + Communication Services (send) = tenant compatibility
- **Confidence Threshold:** 0.7 balances automation vs. quality (based on semantic reranker scoring)

## Authentication Architecture

**Production uses TWO authentication patterns:**

1. **Managed Identity (Service-to-Service)** - PREFERRED
   - Function App → Azure OpenAI: `Cognitive Services OpenAI User` role
   - Function App → Azure AI Search: `Search Index Data Reader` role
   - Function App → Key Vault: Access policy for secrets
   - **No secrets stored** - tokens managed by Azure
   - Configured in `infra/modules/role-assignments.bicep`

2. **API Keys (External Services)**
   - Microsoft Graph: App registration with `Mail.Read` + `Mail.Send` permissions
   - Communication Services: Connection string (stored in Key Vault)
   - RAG Function: x-functions-key for cross-function calls

**Development Portal Access:**
- Optional: Set `currentUserObjectId` in Bicep parameters to view Key Vault secrets
- Get object ID: `(Get-AzADUser -UserPrincipalName user@domain.com).Id`

**Key Files:**
- `docs/AUTHENTICATION-ARCHITECTURE.md` - Complete authentication guide
- `infra/modules/role-assignments.bicep` - RBAC configuration
- `scripts/setup-graph-webhook.ps1` - Graph API app registration

## Development Best Practices

### When Adding New Features

1. **New Azure Function:**
   - Create handler in `demos/04-real-ticket-creation/function/src/functions/NewFunction.ts`
   - Register in `src/index.ts` with `app.http('functionName', {...})`
   - Set appropriate `authLevel`: `'anonymous'` only for webhooks, `'function'` for everything else
   - Deploy: `npm run build && func azure functionapp publish func-agents-<id>`

2. **Modify RAG Logic:**
   - Edit `demos/02-rag-search/rag-function/function_app.py`
   - Test locally: `func start` (requires `.venv` activation)
   - Deploy: `func azure functionapp publish func-rag-<id>`

3. **Update Infrastructure:**
   - Modify Bicep files in `infra/modules/`
   - Test with WhatIf: `az deployment sub what-if --template-file infra/main.bicep`
   - Deploy: `az deployment sub create --template-file infra/main.bicep`
   - Always use subscription-level deployment (not resource group)

### Critical Debugging Patterns

**RAG Returns 0.3 (Fallback) Confidence:**
```powershell
# Check if RAG_API_KEY is configured
az functionapp config appsettings list --name func-agents-<id> --query "[?name=='RAG_API_KEY']"

# If missing, re-run setup
.\scripts\setup-graph-webhook.ps1 -ResourceGroup rg-smart-agents-dev
```

**Email Not Processing:**
1. Check webhook status: `GET https://func-agents-<id>.azurewebsites.net/api/managesubscription`
2. View logs: Application Insights → Transaction Search
3. Verify domain linked: Azure Portal → Communication Services → Domains
4. Check Graph permissions: Azure Portal → App Registrations → API Permissions

**Duplicate Emails:**
- Verify latest code deployed (deduplication logic added Nov 2024)
- Check Table Storage for EmailMessageId values
- Pattern: RowKey should match sanitized EmailMessageId

### Testing Workflow

**Local Testing (Before Deployment):**
```powershell
# Test RAG function locally
cd demos/02-rag-search/rag-function
func start
# In another terminal:
curl -X POST http://localhost:7071/api/rag-search `
  -H "Content-Type: application/json" `
  -d '{"question": "How do I reset my password?"}'

# Test TypeScript functions locally
cd demos/04-real-ticket-creation/function
npm run build
func start
```

**Integration Testing (Deployed System):**
```powershell
# Full deployment verification
.\scripts\verify-deployment.ps1 -ResourceGroup rg-smart-agents-dev

# RAG endpoint test
.\tests\test-demo02-rag.ps1

# E2E email flow test
.\tests\e2e-test.ps1
```

### VS Code Tasks

**Available Tasks (`.vscode/tasks.json`):**
- **"Start Unified Demo UI"** - Launches frontend + backend for Demos 06-08
- **"Run Demo 01 - Triage"** - Tests keyword classification
- **"Run Demo 02 - Ingest KB"** - Uploads markdown docs to Azure AI Search
- **"Start Demo 03 - Functions"** - Local function app for agent tools demo

**Usage:** Terminal → Run Task → Select from list

