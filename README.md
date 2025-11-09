# Azure AI Foundry Smart Support Agent

An AI-powered internal help desk automation system built with **Azure AI Foundry** that reduces mean time to resolution (MTTR) by 50% through intelligent ticket classification, knowledge-grounded answers, and autonomous action execution.

## Use Case

**Problem**: Support teams waste 60-70% of time on repetitive questions ("How do I reset my password?"), manual triage takes 15-20 minutes per ticket, and knowledge is scattered across wikis, SharePoint, and email threads.

**Solution**: Automate the support workflow from email arrival to resolution using Azure AI Foundry's unified platform:

```
Email → Triage (Prompt Flow) → RAG Search (AI Search + OpenAI) → 
  If confidence ≥ 0.7: Create ticket + Auto-reply (Agent + Functions)
  Else: Forward to human review
```

**Impact**:
- **MTTR reduction**: 50% (from 20 min to <10 min for FAQ tickets)
- **L1 deflection**: 40% of emails auto-resolved
- **Cost**: <$0.50 per resolution (LLM tokens + compute)

## Tech Stack

**Azure AI Foundry Components**:
- 🤖 **Azure OpenAI** (gpt-4o-mini + text-embedding-3-large) - Chat completions and embeddings
- 🔍 **Azure AI Search** - Hybrid vector + semantic search for knowledge base
- 🧪 **Prompt Flow** - Low-code orchestration for triage and RAG pipelines
- 📊 **Model Management** - Unified deployment and monitoring portal

**Supporting Services**:
- ⚡ **Azure Functions** - Serverless tools for agent actions (GetOrderStatus, CreateTicket)
- 🔄 **Logic Apps** - Workflow orchestration (email → triage → RAG → response)
- 📈 **Application Insights** - End-to-end observability with correlation IDs
- 🔐 **Key Vault** - Secure credential storage

## Architecture

This repository demonstrates the solution with four progressive demos:

1. **Demo 01: Triage (Prompt Flow)** — AI Foundry prompt flow classifies tickets by category (Billing, Technical, Account, Access) and priority (High, Medium, Low)
2. **Demo 02: RAG Search (AI Search + Prompt Flow)** — Hybrid vector + semantic search retrieves KB passages; prompt flow generates grounded answers with citations
3. **Demo 03: Agent + Tools (OpenAI + Functions)** — Function calling enables actions (getOrderStatus, createTicket) via Azure Functions
4. **Demo 04: Orchestration (Logic Apps + App Insights)** — Logic App orchestrates end-to-end workflow; Application Insights provides observability

### Flow Diagram

```
┌─────────────┐
│ Email       │  [Support] Password reset fails
│ Trigger     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Triage      │  {"category": "Account", "priority": "High"}
│ (Demo 01)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ RAG Search  │  Answer: "Go to https://account.../reset..." [1]
│ (Demo 02)   │  Confidence: 0.92
└──────┬──────┘
       │
       ├──► If confidence ≥ 0.7
       │    ┌─────────────┐
       │    │ CreateTicket│  TKT-20251109-ABC123
       │    │ (Demo 03)   │
       │    └──────┬──────┘
       │           │
       │           ▼
       │    ┌─────────────┐
       │    │ Auto-Reply  │  Email with answer + ticket ID
       │    │ (Demo 04)   │
       │    └─────────────┘
       │
       └──► Else: Forward to support-team@example.com
```

## Prerequisites

### Required Software

- **Node.js** 20 LTS ([download](https://nodejs.org/))
- **TypeScript** 5.x: `npm install -g typescript`
- **Azure Functions Core Tools** 4.x: `npm install -g azure-functions-core-tools@4 --unsafe-perm true`
- **Azure CLI** 2.50+: [install guide](https://learn.microsoft.com/cli/azure/install-azure-cli)
- **Azure Developer CLI (azd)**: [install guide](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- **Python** 3.10+ with pip
- **VS Code** with extensions:
  - Azure Tools
  - Azure Functions
  - Azure Resources
  - GitHub Copilot
  - GitHub Copilot Chat
  - Prompt flow for VS Code

### Python Dependencies

```bash
pip install promptflow==1.15.0 promptflow-tools==1.4.0 python-dotenv
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables (populate after infrastructure deployment):

```env
AZURE_OPENAI_ENDPOINT=https://<your-openai>.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_API_KEY=

AZURE_AI_SEARCH_ENDPOINT=https://<your-search>.search.windows.net
AZURE_AI_SEARCH_INDEX=kb-support
AZURE_AI_SEARCH_API_KEY=

APPINSIGHTS_CONNECTION_STRING=

SUPPORT_REPLY_FROM=helpdesk@example.com
```

## Quick Start

### ✨ One-Command Deployment (Recommended)

The easiest way to deploy the complete solution:

```powershell
# Login to Azure
Connect-AzAccount
Set-AzContext -SubscriptionId <subscription-id>

# Deploy everything (infrastructure + code + knowledge base)
.\scripts\deploy.ps1
```

This script will:
1. ✅ Deploy all Azure resources (OpenAI, Search, Functions, Key Vault, etc.)
2. ✅ Configure Managed Identity authentication (no API keys needed!)
3. ✅ Build and deploy Azure Functions with proper TypeScript compilation
4. ✅ Update `.env` with all connection strings
5. ✅ Ingest knowledge base documents to Azure AI Search

**Deployment time**: ~5-7 minutes

---

### Manual Deployment (Advanced)

If you prefer step-by-step control or need to troubleshoot:

### Important: Use Azure PowerShell (Azure CLI has issues on Windows)

The Azure CLI 2.76.0 has known DLL errors on Windows. Use **Azure PowerShell** instead.

### 1. Deploy Infrastructure

```powershell
# Login to Azure
Connect-AzAccount
Set-AzContext -SubscriptionId <subscription-id>

# Deploy to Sweden Central (GPT-4o-mini availability)
$deployName = "smartagents-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-AzSubscriptionDeployment `
  -Location swedencentral `
  -TemplateFile infra/main.bicep `
  -TemplateParameterFile infra/parameters.dev.json `
  -Name $deployName

# Monitor deployment
Get-AzSubscriptionDeployment -Name $deployName | Select-Object ProvisioningState
```

Export outputs to `.env`:

```powershell
# Get deployment outputs
$deployment = Get-AzSubscriptionDeployment -Name $deployName
$outputs = $deployment.Outputs

# Get OpenAI API key
$rgName = $outputs['resourceGroupName'].Value
$openAIName = $outputs['openAIAccountName'].Value
$keys = Get-AzCognitiveServicesAccountKey -ResourceGroupName $rgName -Name $openAIName

# Get Search API key via REST API
$token = (Get-AzAccessToken -ResourceUrl "https://management.azure.com").Token
$searchName = $outputs['searchServiceName'].Value
$uri = "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/$rgName/providers/Microsoft.Search/searchServices/$searchName/listAdminKeys?api-version=2023-11-01"
$response = Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $token" } -Method POST

# Update .env manually or use the provided scripts
```

### 2. Run Demo 01 - Triage

```powershell
# Test single ticket
python test-demo01.py

# Test multiple scenarios (recommended)
python test-multiple-tickets.py
```

Expected output:
```
[1/6] Ticket: VPN disconnects every 5 minutes
✓ Category: Technical
✓ Priority: Medium
```

### 3. Run Demo 02 - RAG Search

```powershell
# First, ingest knowledge base into Azure AI Search
python ingest-kb.py

# Expected output:
# ✓ Index 'kb-support' created successfully
# [1] billing-guide.md: Billing and Payments
#     ✓ Embedded successfully
# [2] password-reset.md: Password Reset
#     ✓ Embedded successfully
# [3] vpn-troubleshooting.md: VPN Connection Guide
#     ✓ Embedded successfully
# ✓ Uploaded 3 documents successfully

# Then test RAG search
python test-demo02-rag.py
```

Expected output:
```
[1/3] Question: How do I reset my password?
✓ Answer: To reset your password, follow these steps:
1. Navigate to the login page...
2. Click on "Forgot Password?"...

[Source: [1] Password Reset Guide]

# Run evaluation on dataset
pf flow test -f flow.dag.yaml --inputs data/eval.jsonl
```

### 3. Run Demo 02 - RAG Search

```bash
# Install dependencies
cd demos/02-rag-search/ingest
npm install

# Create search index
npm run create-index

# Ingest knowledge base
npm run dev

# Test RAG flow
cd ..
pf flow test -f flow.dag.yaml --inputs question="How to reset my account password?"
```

### 4. Run Demo 03 - Agent with Tools

```bash
# Start Azure Functions (terminal 1)
cd demos/03-agent-with-tools/function-tool
npm install
func start

# Run agent client (terminal 2)
cd demos/03-agent-with-tools/agent
npm install
npm run dev -- "Where is order 12345?"
```

### 5. Deploy Demo 04 - Orchestration

```bash
# Deploy Logic App
az logicapp deployment source config-zip \
  --resource-group <rg-name> \
  --name <logicapp-name> \
  --src demos/04-orchestration-and-monitoring/logicapp.zip

# Deploy monitoring alerts
az deployment group create \
  --resource-group <rg-name> \
  --template-file demos/04-orchestration-and-monitoring/monitoring/alerts.bicep
```

## Documentation

- **[Product Brief](docs/PRODUCT_BRIEF.md)** - Use case, personas, success metrics, NFRs
- **[User Stories](docs/user-stories.md)** - BDD scenarios and acceptance criteria
- **[Non-Functional Requirements](docs/nfr.md)** - Performance, security, cost targets
- **[Operational Runbook](docs/runbook.md)** - Incident response, maintenance procedures
- **[Session Script](docs/session-script.md)** - Conference talk track and demo flow

## Project Structure

```
espc25/
├── infra/                      # Bicep infrastructure templates
│   ├── main.bicep             # Subscription-scoped deployment
│   ├── parameters.dev.json    # Environment-specific params
│   └── modules/               # Modular resource templates
├── demos/
│   ├── 01-triage-promptflow/   # Ticket classification with Prompt flow
│   │   ├── flow.dag.yaml      # Flow definition
│   │   ├── prompts/           # Jinja2 templates
│   │   └── data/eval.jsonl    # Test cases
│   ├── 02-rag-search/          # RAG with Azure AI Search
│   │   ├── ingest/            # TypeScript ingestion tool
│   │   ├── flow.dag.yaml      # RAG flow
│   │   └── content/           # Sample KB articles
│   ├── 03-agent-with-tools/    # Function calling agent
│   │   ├── function-tool/     # Azure Functions
│   │   └── agent/             # TypeScript agent client
│   └── 04-orchestration-and-monitoring/  # Logic Apps + App Insights
│       ├── logicapp/          # Workflow definition
│       └── monitoring/        # KQL queries + alerts
├── docs/                       # Product docs, user stories, runbooks
├── sample-data/                # 20 realistic test tickets + KB articles
├── tests/                      # E2E and contract tests
└── .github/                    # Copilot instructions and CI workflows
```

## Architecture

### System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Triage Agent** | Azure AI Foundry Prompt flow | Classify tickets by category/priority |
| **Retrieval Agent** | Azure AI Search | Hybrid vector + semantic search |
| **Analysis Agent** | Azure OpenAI gpt-4o-mini | Generate grounded answers with citations |
| **Action Agent** | Azure Functions (Node 20) | Execute tools (getOrderStatus, createTicket) |
| **Orchestrator** | Logic Apps Standard | Email → triage → RAG → action → reply |
| **Observability** | Application Insights | Traces, metrics, alerts |

### Data Flow

```
┌─────────────┐
│ Email       │  Subject: [Support] Password reset fails
│ Trigger     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Triage      │  {"category": "Account", "priority": "High"}
│ (Prompt     │  (LLM: gpt-4o-mini with JSON mode)
│  Flow)      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ RAG Search  │  1. Query: "password reset"
│ (Hybrid)    │  2. Top 5 passages retrieved
│             │  3. Answer: "Go to https://account.../reset..." [1]
│             │  4. Confidence: 0.92
└──────┬──────┘
       │
       ├──► If confidence ≥ 0.7
       │    ┌─────────────┐
       │    │ Agent       │  Calls: createTicket(title, description, customerId)
       │    │ (Function   │  Result: {"ticketId": "TKT-20251109-ABC123"}
       │    │  Calling)   │
       │    └──────┬──────┘
       │           │
       │           ▼
       │    ┌─────────────┐
       │    │ Auto-Reply  │  Email with:
       │    │ (Logic App) │  - Grounded answer
       │    │             │  - Citation [1] → KB URL
       │    │             │  - Ticket ID for tracking
       │    └─────────────┘
       │
       └──► Else: Forward to support-team@example.com
                  (Low confidence or out-of-scope)

All steps → Application Insights (correlation ID, duration, tokens)
```

### Key Design Decisions

- **RAG over fine-tuning**: Enterprise KB changes frequently; RAG allows real-time updates
- **Function calling over hardcoded rules**: LLM decides *when* to call tools; scales to N tools
- **Logic Apps for orchestration**: Low-code; handles email, retries, conditional branching
- **Managed Identity everywhere**: No secrets in code; RBAC for service-to-service auth
- **Application Insights for observability**: Custom metrics (tokens, tool invocations) + distributed tracing

## Development Workflow

### Local Testing

```bash
# Prompt flows
pf flow test -f demos/01-triage-promptflow/flow.dag.yaml --inputs ticket_text="test"

# Azure Functions
cd demos/03-agent-with-tools/function-tool && func start

# Agent client
cd demos/03-agent-with-tools/agent && npm run dev -- "test query"
```

### Evaluation

Run evaluation datasets to measure quality:

```bash
# Triage accuracy
pf flow test -f demos/01-triage-promptflow/flow.dag.yaml -d demos/01-triage-promptflow/data/eval.jsonl

# RAG groundedness (manual review of citations)
pf flow test -f demos/02-rag-search/flow.dag.yaml -d sample-data/rag-eval.jsonl
```

**Success criteria**:
- Triage: ≥90% correct category
- RAG: 100% answers cite only provided passages (no hallucination)

### Deployment

```bash
# Deploy Prompt flows
pf flow deploy -f demos/01-triage-promptflow/flow.dag.yaml --name triage-flow

# Deploy Functions
cd demos/03-agent-with-tools/function-tool
func azure functionapp publish <function-app-name>

# Import Logic App
az logicapp deployment source config-zip \
  --resource-group <rg> \
  --name <logic-app> \
  --src demos/04-orchestration-and-monitoring/logicapp.zip
```

### Monitoring

Query Application Insights with pre-built KQL:

```bash
# Open Azure Portal → Application Insights → Logs
# Copy queries from: demos/04-orchestration-and-monitoring/monitoring/appinsights-queries.kql
```

**Key queries**:
- MTTR trend (avg resolution time per day)
- Error rate by operation
- Token cost per resolved ticket
- P95 latency by step

## Extending to Other Domains

This architecture is **domain-agnostic**. To adapt for HR, Finance, or Sales:

1. **Update triage categories**: Edit `demos/01-triage-promptflow/prompts/system.jinja2`
2. **Add domain KB**: Drop markdown files in `sample-data/kb/`, run `npm run ingest`
3. **Implement domain tools**: Add Functions in `demos/03-agent-with-tools/function-tool/src/`
4. **Evaluate**: Create eval dataset for new domain; target ≥90% accuracy

**Example - HR Support**:
- Categories: Benefits, Payroll, Leave, Performance
- Tools: CheckPTOBalance, SubmitExpenseReport, RequestTimeOff
- KB: PTO policy, 401k guide, performance review process

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code conventions (Jinja2 templates, naming patterns)
- Testing requirements (evaluation datasets, unit tests)
- CI/CD pipeline (GitHub Actions)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Function app won't start | Run `func start --verbose` to see detailed errors |
| Functions return 404 after deployment | Check `demos/03-agent-with-tools/function-tool/DEPLOYMENT-REQUIREMENTS.md` for TypeScript config requirements |
| Prompt flow validation fails | Check `pf flow validate -f flow.dag.yaml --verbose` |
| Missing search index | Verify with `az search index show --service-name <name> --name kb-support` |
| No App Insights traces | Confirm `APPINSIGHTS_CONNECTION_STRING` is set correctly |
| Agent shows "service unavailable" | Ensure `.env` has `AZURE_FUNCTION_APP_URL` ending with `/api` |
| "Missing credentials" error | Scripts use `DefaultAzureCredential` - run `az login` or `Connect-AzAccount` |

### Common Azure Functions Issues

**Functions not listed after deployment**:
- Verify `tsconfig.json` has `"rootDir": "./src"` (not `"./"`)
- Ensure `src/index.ts` exists and imports all functions
- Check `package.json` has `"main": "dist/index.js"` (not `"dist/src/index.js"`)
- See detailed guide: `demos/03-agent-with-tools/function-tool/DEPLOYMENT-REQUIREMENTS.md`

## License

MIT

## Resources

- [Azure AI Foundry documentation](https://learn.microsoft.com/azure/ai-studio/)
- [Prompt flow guide](https://learn.microsoft.com/azure/ai-studio/how-to/prompt-flow)
- [Azure AI Search](https://learn.microsoft.com/azure/search/)
- [Azure Functions](https://learn.microsoft.com/azure/azure-functions/)
