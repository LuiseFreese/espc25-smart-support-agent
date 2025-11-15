# Azure AI Foundry Smart Support Agent

Autonomous IT support system demonstrating Azure AI Foundry capabilities through progressive demos: ticket classification, RAG search, agentic tool use, and event-driven email processing.

## What This Repository Contains

This project showcases **4 progressive demonstrations** of building intelligent support automation with Azure AI Foundry:

| Demo | What It Shows | Deployment Status | Key Technologies |
|------|---------------|-------------------|------------------|
| **[Demo 01: Triage](demos/01-triage-promptflow/)** | Classify support tickets by category and priority | 📚 **Reference** (logic used in Demo 04) | Azure OpenAI (GPT-4o-mini), Prompt engineering |
| **[Demo 02: RAG Search](demos/02-rag-search/)** | Answer questions using knowledge base retrieval | ✅ **Deployed** (Python Function) | Azure AI Search (vector + semantic), Embeddings |
| **[Demo 03: Agent Tools](demos/03-agent-with-tools/)** | Execute actions via function calling | 📚 **Reference** (pattern used in Demo 04) | Azure Functions, OpenAI function calling |
| **[Demo 04: Production System](demos/04-real-ticket-creation/)** | End-to-end event-driven email processing | ✅ **Deployed** (Node.js Function) | Microsoft Graph webhooks, Table Storage |

**Architecture Overview:**
```
Email arrives → Graph webhook → Triage (Demo 01 logic) → RAG search (Demo 02) → 
  Create ticket (Demo 03 pattern) → Auto-reply or escalate (Demo 04)
```

**What Gets Deployed:**
- ✅ **2 Azure Functions:** Demo 02 RAG function (Python) + Demo 04 email processor (Node.js)
- 📚 **Demos 01 & 03:** Educational references showing concepts integrated into Demo 04

Each demo builds on the previous, culminating in a production-ready system that auto-resolves 60-80% of support tickets.

## Prerequisites

### Required Tools
- **Azure CLI** (v2.50+): `winget install Microsoft.AzureCLI`
- **Azure subscription** with permissions to create resources
- **Node.js** (v20+): For Azure Functions development
- **Python** (v3.11+): For RAG function and test scripts
- **PowerShell** (v7+): For deployment and test scripts

### Azure Resources (Deployed via Bicep)
- **Azure AI Foundry** (AI Hub + AI Project)
- **Azure OpenAI** (gpt-4o-mini, text-embedding-3-large)
- **Azure AI Search** (Standard tier for semantic ranking)
- **Azure Functions** (Node.js 20 + Python 3.11)
- **Storage Account** (Table Storage for tickets)
- **Application Insights** (Monitoring and logging)
- **Key Vault** (Secrets management)

**Estimated Monthly Cost:** ~$250-300 (mostly AI Search Standard tier)

### Optional: Microsoft 365 Tenant
Required only for **Demo 04** (email processing):
- Microsoft 365 mailbox for monitoring (e.g., support@yourdomain.com)
- App registration with Graph API permissions (`Mail.Read`, `Mail.Send`)
- Admin consent for application permissions


## Getting Started

### Step 1: Deploy Azure Infrastructure

Deploy all required Azure resources to your subscription:

```powershell
# Login to Azure
az login
az account set --subscription <your-subscription-id>

# Deploy infrastructure (creates ~15 resources)
az deployment sub create `
  --location eastus `
  --template-file infra/main.bicep `
  --parameters @infra/parameters.dev.json

# Save deployment outputs for later use
az deployment sub show --name <deployment-name> --query properties.outputs
```

**What Gets Deployed:**
- Resource Group: `rg-smart-agents-dev` (Sweden Central)
- Azure AI Hub + AI Project
- Azure OpenAI with 2 model deployments (gpt-4o-mini, text-embedding-3-large)
- Azure AI Search (Standard tier)
- 2 Function Apps (Node.js 20 for email processing, Python 3.11 for RAG)
- Storage Account with Table Storage
- Application Insights + Log Analytics Workspace
- Key Vault with secrets

**Deployment Time:** ~10-15 minutes

### Step 2: Configure Environment Variables

**For Azure deployment**, the Bicep templates automatically configure all settings in the Function Apps.

**For local development** (optional), update `local.settings.json` files with your deployed resource values:

**Demo 02 RAG Function** (`demos/02-rag-search/rag-function/local.settings.json`):
```json
{
  "AZURE_AI_SEARCH_ENDPOINT": "https://srch-agents-<random>.search.windows.net",
  "AZURE_AI_SEARCH_API_KEY": "<get-from-portal>",
  "AZURE_OPENAI_ENDPOINT": "https://oai-agents-<random>.openai.azure.com/"
}
```

**Demo 04 Email Function** (`demos/04-real-ticket-creation/function/local.settings.json`):
```json
{
  "GRAPH_CLIENT_ID": "<app-registration-id>",
  "GRAPH_CLIENT_SECRET": "<app-registration-secret>",
  "GRAPH_TENANT_ID": "<tenant-id>",
  "SUPPORT_EMAIL_ADDRESS": "support@yourdomain.com",
  "STORAGE_ACCOUNT_NAME": "stagents<random>",
  "STORAGE_ACCOUNT_KEY": "<get-from-portal>"
}
```

**Get Values from Deployment:**
```powershell
# Get deployment outputs
az deployment sub show \
  --name smart-agents-deployment \
  --query properties.outputs -o json

# Get API keys
az search admin-key show --service-name srch-agents-<random> --resource-group rg-smart-agents-dev
az storage account keys list --name stagents<random> --resource-group rg-smart-agents-dev
```

> **Note:** Local settings are only needed for running functions locally with `func start`. Deployed functions get settings automatically from Bicep.

### Step 3: Ingest Knowledge Base (Demo 02)

Load support documentation into Azure AI Search:

```powershell
cd demos/02-rag-search
pip install -r requirements.txt
python ingest-kb.py
```

**What This Does:**
- Reads markdown files from `content/` directory
- Generates vector embeddings using text-embedding-3-large
- Uploads to Azure AI Search index with semantic ranking enabled

**Expected Output:** `Successfully indexed 3 documents to kb-support index`

### Step 4: Deploy Azure Functions

Deploy the **2 production functions** (Demos 01 & 03 are reference implementations only):

```powershell
# Deploy Demo 04: Email processing function (Node.js)
# Includes Demo 01 triage logic + Demo 03 function calling pattern
cd demos/04-real-ticket-creation/function
npm install
npm run build
func azure functionapp publish func-agents-<random>

# Deploy Demo 02: RAG search function (Python)
cd demos/02-rag-search/rag-function
func azure functionapp publish func-rag-<random>
```

**Verify Deployments:**
```powershell
# Test RAG function
Invoke-RestMethod -Uri "https://func-rag-<random>.azurewebsites.net/api/rag-search" `
  -Method Post `
  -Body '{"query":"How do I reset my password?"}' `
  -ContentType "application/json"

# Test email function health
Invoke-RestMethod -Uri "https://func-agents-<random>.azurewebsites.net/api/pingstorage"
```

### Step 5: Configure Microsoft Graph Webhook (Demo 04 Only)

**Manual Steps Required:**

1. **Create App Registration:**
   - Go to Azure Portal → Entra ID → App registrations → New registration
   - Name: `SmartSupportAgent`
   - Supported account types: Single tenant
   - No redirect URI needed

2. **Add API Permissions:**
   - Microsoft Graph → Application permissions:
     - `Mail.Read` - Read mail in all mailboxes
     - `Mail.Send` - Send mail as any user
     - `User.Read.All` - Read all users' basic profiles
   - Click **Grant admin consent**

3. **Create Client Secret:**
   - Certificates & secrets → New client secret
   - Copy the secret value (you won't see it again!)

4. **Update Function App Settings:**
   ```powershell
   az webapp config appsettings set `
     --name func-agents-<random> `
     --resource-group rg-smart-agents-dev `
     --settings `
       GRAPH_CLIENT_ID="<app-registration-id>" `
       GRAPH_CLIENT_SECRET="<client-secret>" `
       GRAPH_TENANT_ID="<your-tenant-id>" `
       SUPPORT_EMAIL="your-support@yourdomain.com"
   ```

5. **Create Webhook Subscription:**
   ```powershell
   $functionKey = az functionapp keys list --name func-agents-<random> --resource-group rg-smart-agents-dev --query "functionKeys.default" -o tsv
   
   Invoke-RestMethod -Uri "https://func-agents-<random>.azurewebsites.net/api/managesubscription" `
     -Method Post `
     -Headers @{ "x-functions-key" = $functionKey }
   ```

**Note:** Webhook subscriptions expire after 3 days and must be renewed. See [docs/WEBHOOK-MANAGEMENT.md](docs/WEBHOOK-MANAGEMENT.md) for renewal instructions.

### Step 6: Test Each Demo

**Demo 01 - Triage:**
```powershell
cd tests
python test-demo01-triage.py
```
Expected: 100% category accuracy, 80%+ priority accuracy

**Demo 02 - RAG Search:**
```powershell
.\test-demo02-rag.ps1
```
Expected: Confidence scores 0.6-0.9 for relevant queries

**Demo 03 - Agent Tools:**
```powershell
cd demos/03-agent-with-tools/agent
npm install
npm run dev -- "Where is order 12345?"
```
Expected: Agent calls GetOrderStatus function and returns tracking info

**Demo 04 - Email Processing (if webhook configured):**
Send email to your configured support address with subject "VPN not connecting"
Expected: Auto-reply within 10 seconds with troubleshooting steps

## Demo Details

Each demo folder contains:
- **README.md** - Azure resources used and their purpose
- **Source code** - TypeScript/Python implementations
- **Requirements** - Dependencies and configuration

Navigate to individual demo READMEs for detailed resource explanations:
- [Demo 01: Ticket Triage](demos/01-triage-promptflow/README.md)
- [Demo 02: RAG Search](demos/02-rag-search/README.md)
- [Demo 03: Agent with Tools](demos/03-agent-with-tools/README.md)
- [Demo 04: Production Email System](demos/04-real-ticket-creation/function/README.md)

## What You Need to Do Manually

The Bicep deployment automates most infrastructure setup, but these steps require manual configuration:

### Required Manual Steps

1. **App Registration for Graph API (Demo 04 only):**
   - Create app registration in Entra ID
   - Add Mail.Read, Mail.Send, User.Read.All permissions
   - Grant admin consent
   - Create and copy client secret
   - Update function app settings with credentials

2. **Webhook Subscription (Demo 04 only):**
   - Call ManageSubscription endpoint to create subscription
   - Renew every 3 days (Microsoft Graph limitation)

3. **Knowledge Base Content (All demos):**
   - Add your own markdown documentation to `demos/02-rag-search/content/`
   - Run `ingest-kb.py` to index into Azure AI Search

4. **Environment Variables:**
   - Create `.env` file with deployment outputs
   - Get API keys from Azure Portal for OpenAI and AI Search
   - Get function keys via Azure CLI

### Optional Manual Steps

1. **Custom Email Domain:**
   - Configure custom domain in Microsoft 365
   - Update SUPPORT_EMAIL setting

2. **Monitoring Alerts:**
   - Configure Application Insights alerts for errors
   - Set up budget alerts for cost management

3. **Knowledge Base Expansion:**
   - Add more documents to improve coverage
   - Test confidence scores and refine content

## Architecture Overview

```mermaid
graph TD
    subgraph "Demo 04: Production Email System"
        A[Email Arrives] --> B[Graph Webhook]
        B --> C[Triage - Demo 01]
        C --> D[RAG Search - Demo 02]
        D --> E[Create Ticket - Demo 03 Pattern]
        E --> F{High Confidence?}
        F -->|Yes| G[Auto-reply]
        F -->|No| H[Escalate]
    end

    subgraph "Azure AI Foundry Resources"
        I[Azure OpenAI<br/>GPT-4o-mini<br/>Embeddings]
        J[AI Search<br/>Vector + Semantic]
        K[Functions<br/>Node.js + Python]
        L[Table Storage<br/>Tickets]
        M[Key Vault<br/>Secrets]
        N[App Insights<br/>Monitoring]
    end

    style A fill:#0078d4,color:#fff
    style F fill:#ffb900,color:#000
    style G fill:#107c10,color:#fff
    style H fill:#d13438,color:#fff
```

## Project Structure

```
espc25/
├── demos/
│   ├── 01-triage-promptflow/      # Classification with prompts
│   ├── 02-rag-search/              # Knowledge base retrieval
│   ├── 03-agent-with-tools/        # Function calling
│   └── 04-real-ticket-creation/    # Production email system
├── infra/
│   ├── main.bicep                  # Infrastructure as Code
│   └── parameters.dev.json         # Environment config
├── tests/
│   ├── test-demo01-triage.py       # Triage validation
│   ├── test-demo02-rag.ps1         # RAG confidence tests
│   └── TEST-EMAIL-SCENARIOS.md     # Email test cases
└── docs/
    ├── WEBHOOK-MANAGEMENT.md       # Graph webhook guide
    └── DEPLOYMENT-ARCHITECTURE.md  # Detailed architecture
```

## Troubleshooting

### "Deployment failed: InvalidTemplateDeployment"
- Check Azure subscription has required resource providers registered
- Verify you have Owner or Contributor role on subscription

### "Function app not responding"
- Check function app logs: `az webapp log tail --name func-agents-<random> --resource-group rg-smart-agents-dev`
- Verify environment variables are set in function app settings

### "RAG search returns low confidence"
- Verify knowledge base documents are indexed: Check AI Search portal
- Add more relevant content to `demos/02-rag-search/content/`
- Re-run `ingest-kb.py`

### "Webhook not processing emails"
- Check subscription status: GET `/api/managesubscription`
- Verify app registration has admin consent for Graph API permissions
- Check Application Insights logs for webhook errors

## Contributing

This is a demonstration project. To adapt for your use case:

1. **Customize Knowledge Base:** Replace `demos/02-rag-search/content/*.md` with your documentation
2. **Modify Triage Rules:** Update keyword matching in `demos/04-real-ticket-creation/function/src/services/AIService.ts`
3. **Add Custom Functions:** Create new tool endpoints in `demos/03-agent-with-tools/function-tool/src/`
4. **Adjust Confidence Threshold:** Modify auto-resolve threshold in `GraphWebhook.ts` (currently 0.7)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Additional Resources

- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-studio/)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/ai-services/openai/)
- [Azure AI Search](https://learn.microsoft.com/azure/search/)
- [Microsoft Graph Webhooks](https://learn.microsoft.com/graph/webhooks)
