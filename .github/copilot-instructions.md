# Azure AI Foundry Smart Support Agent - Copilot Instructions

## Project Overview

This repository demonstrates building an **autonomous IT support agent** using Azure AI Foundry with 4 progressive demos:

1. **Demo 01:** Ticket triage (keyword-based classification)
2. **Demo 02:** RAG search with Azure AI Search
3. **Demo 03:** Agent with function calling (tool use)
4. **Demo 04:** Production email processing system (event-driven webhooks)

**Core Stack:** Azure AI Foundry • Azure OpenAI • Azure AI Search • Azure Functions • Table Storage • Application Insights

**Deployment:** Sweden Central region

## Key Architecture Concepts

- **Event-Driven:** Microsoft Graph webhooks for instant email processing
- **Hybrid Email:** Graph API for reading, Azure Communication Services for sending
- **Keyword Triage:** Fast, deterministic classification (Network, Access, Billing, Software)
- **RAG with Confidence:** Azure AI Search semantic ranking maps to confidence scores (0.1-0.95)
- **Table Storage:** All tickets persisted with unique IDs (TKT-YYYYMMDD-XXXXXX)
- **Duplicate Prevention:** EmailMessageId as RowKey enforces uniqueness
- **Infrastructure as Code:** Bicep templates for all Azure resources
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

## Repository Structure

```
demos/
├── 01-triage-promptflow/      # Keyword classification
├── 02-rag-search/              # Knowledge base + RAG search
├── 03-agent-with-tools/        # Function calling demo
└── 04-real-ticket-creation/    # Production email system
    └── function/src/
        ├── functions/          # Azure Functions endpoints
        ├── services/           # Business logic
        └── models/             # TypeScript types

infra/
├── main.bicep              # Main infrastructure template
├── parameters.dev.json     # Environment config
└── modules/                # Individual resource modules

tests/                      # Test scenarios and scripts
docs/                       # Architecture documentation
```

## Coding Conventions

- **TypeScript:** Azure Functions v4 model, compile before deploy (`npm run build`)
- **Auth Levels:** `'function'` for production (requires x-functions-key), `'anonymous'` for webhooks
- **Environment Variables:** `AZURE_*` or `GRAPH_*` prefix
- **Bicep:** Use `@secure()` for secrets, Managed Identity for service-to-service auth

## Essential Commands

### Local Development
```bash
# Setup
az login && az account set -s <subscription-id>
npm install -g typescript azure-functions-core-tools@4

# Build function
cd demos/04-real-ticket-creation/function
npm install
npm run build

# Test locally
func start

# Deploy to Azure
func azure functionapp publish func-agents-dw7z4hg4ssn2k
```

### Deployment
```bash
# Deploy infrastructure
cd infra
az deployment sub create \
  --location westeurope \
  --template-file main.bicep \
  --parameters @parameters.dev.json

# Link Communication Services domain (REQUIRED)
cd ..\scripts
.\post-deploy-communication-services.ps1 -ResourceGroup rg-smart-agents-dev

# Configure Graph webhook (auto-configures RAG_API_KEY!)
.\setup-graph-webhook.ps1 -ResourceGroup rg-smart-agents-dev -SupportEmail support@domain.com

# Deploy function code
cd ..\demos\04-real-ticket-creation\function
npm install && npm run build
func azure functionapp publish func-agents-<uniqueid>

# Verify deployment
cd ..\..\scripts
.\verify-deployment.ps1 -ResourceGroup rg-smart-agents-dev
```

## Common Development Tasks

| Task | Action |
|------|--------|
| Add new Azure Function | Create in `src/functions/`, register in `src/index.ts` |
| Update triage logic | Modify `AIService.ts` → `keywordBasedTriage()` |
| Add KB document | Add markdown to `demos/02-rag-search/content/`, run `ingest-kb.py` |
| Update infrastructure | Modify `infra/modules/*.bicep`, redeploy with `az deployment sub create` |
| Renew webhook (expires 3 days) | POST to `/api/managesubscription` endpoint |

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

