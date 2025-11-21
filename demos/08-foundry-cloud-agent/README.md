# Demo 08: Cloud-Hosted Foundry Agent

**Build a Smart Support Agent in Azure AI Foundry using cloud-based grounding tools**

## What This Demo Is

This demo showcases a **fully cloud-hosted agent** built with Azure AI Foundry's GA (General Availability) toolchain:

- **Azure AI Search** (`enterpriseSearch` tool) — Enterprise knowledge base with 11 support documents
- **File Search** (`fileSearch` tool) — Cloud vector store for curated FAQs and policies
- **Triage API** — Classifies support requests by category and priority (from Demo 05)
- **Ticket API** — Creates support tickets in Azure Table Storage (from Demo 04)

**No local servers, no SDK code, no experimental features.**  
Everything runs in Azure AI Foundry using the VS Code extension and YAML configuration.

## Architecture

```
User Question
    ↓
Foundry Agent (GPT-5.1-chat)
    ↓
Decides which tool to call:
    ├─ triage (classify intent)
    ├─ fileSearch (FAQs, policies)
    ├─ enterpriseSearch (product docs, troubleshooting)
    └─ ticket (create escalation)
```

**Key Difference from Previous Demos:**
- Demo 02: Local RAG with Python function
- Demo 05: Copilot Studio plugin with triage/answer endpoints
- **Demo 08: Cloud-native agent orchestration** with Foundry managing all tool invocations

## How to Use This Demo

### Prerequisites

1. **Azure AI Foundry VS Code Extension**
   - Install from VS Code Marketplace: `ms-azuretools.vscode-azureaifoundry`
   - Sign in to Azure (`Ctrl+Shift+P` → "Azure: Sign In")

2. **Azure Resources Deployed**
   - Function App (`func-agents-{uniqueid}`) with triage & ticket endpoints
   - Function App (`func-rag-{uniqueid}`) with RAG search endpoint
   - Azure AI Search index (`kb-support`) with 11 documents
   - Azure AI Foundry project created

3. **Foundry Project Setup**
   - Create AI Hub and AI Project in Sweden Central region
   - Deploy `gpt-5.1-chat` model
   - Note the deployment name (you'll need it for `cloud-support-agent.yaml`)

### Step-by-Step Setup

#### 1. Configure Agent YAML

Open `agent/cloud-support-agent.yaml` and update:

```yaml
model:
  id: 'gpt-5-1-chat'  # Replace with your deployment name
```

#### 2. Update OpenAPI Endpoints

Edit each OpenAPI file in `agent/tools/` and replace `{uniqueid}` with your actual function app ID:

**Files to update:**
- `triage-api.yaml`: Line 8 — `https://func-agents-YOUR_ID.azurewebsites.net`
- `ticket-api.yaml`: Line 8 — `https://func-agents-YOUR_ID.azurewebsites.net`
- `rag-openapi.yaml`: Line 8 — `https://func-rag-YOUR_ID.azurewebsites.net`

**Find your function app ID:**
```powershell
az functionapp list --query "[?contains(name, 'func-agents')].name" -o tsv
```

#### 3. Configure File Search Vector Store

1. Go to [Azure AI Foundry portal](https://ai.azure.com)
2. Navigate to your AI Project → **Vector Stores**
3. Click **New Vector Store**
4. Name: `support-agent-files`
5. Upload sample documents:
   - Create `refund-policy.md` (see `tools/file-search-notes.md` for content)
   - Create `vpn-faq.md` (see example in notes)
   - Upload any other curated policy docs

#### 4. Import Agent in VS Code

1. Open `agent/cloud-support-agent.yaml` in VS Code
2. Press `Ctrl+Shift+P` → **Azure AI Foundry: Import Agent**
3. Select your Foundry project
4. The extension will:
   - Upload the agent configuration
   - Register all OpenAPI tools
   - Link the file_search vector store

#### 5. Test in Playground

**Option A: VS Code Extension Playground**
1. `Ctrl+Shift+P` → **Azure AI Foundry: Open Playground**
2. Select `cloud-support-agent`
3. Run test queries (see below)

**Option B: Foundry Portal Playground**
1. Go to [ai.azure.com](https://ai.azure.com)
2. Open your AI Project → **Agents**
3. Select `cloud-support-agent`
4. Click **Test in Playground**

#### 6. Observe Tool Invocation Traces

After each query, check the **Trace** panel to see:
- Which tool was called
- The tool's input parameters
- The tool's response
- How the agent used the response to generate the final answer

## File Search vs Azure AI Search

**Why do we have BOTH grounding tools?**

| Scenario                          | Tool Used                     | Reason                               |
| --------------------------------- | ----------------------------- | ------------------------------------ |
| "What is our refund policy?"      | `fileSearch`                  | Policy document in vector store      |
| "How to reset my password?"       | `enterpriseSearch`            | Product knowledge in Azure AI Search |
| "VPN keeps disconnecting"         | `triage` → `enterpriseSearch` | Troubleshooting guide in KB          |
| "I need a refund for order 12345" | `fileSearch` → `ticket`       | Check policy, then escalate          |

**Design Principle:**
- **File Search**: Small, curated, frequently-updated internal docs
- **Azure AI Search**: Large-scale, comprehensive product/technical documentation

## Test Prompts

Try these queries in the Playground:

### 1. VPN Troubleshooting (should use enterpriseSearch)
```
My VPN keeps disconnecting every 5 minutes. How do I fix it?
```

**Expected flow:**
1. Agent calls `triage` → Category: Network
2. Agent calls `enterpriseSearch` → Finds VPN troubleshooting guide
3. Agent returns answer with steps

### 2. Refund Policy (should use fileSearch)
```
What is your refund policy?
```

**Expected flow:**
1. Agent recognizes policy question
2. Agent calls `fileSearch` → Retrieves refund-policy.md
3. Agent returns policy details

### 3. Ticket Creation (should use ticket tool)
```
Please create a ticket for my VPN issue. My email is user@contoso.com.
```

**Expected flow:**
1. Agent calls `triage` → Category: Network, Priority: Medium
2. Agent calls `ticket` → Creates TKT-YYYYMMDD-XXXXXX
3. Agent confirms ticket ID and status

### 4. Multi-Tool Flow (should use triage + enterpriseSearch + ticket)
```
I can't access the portal and need urgent help. Email: user@contoso.com
```

**Expected flow:**
1. Agent calls `triage` → Category: Access, Priority: High
2. Agent calls `enterpriseSearch` → Looks for portal access docs
3. If confidence < 0.7, agent calls `ticket` → Escalates to support team

## Key Files

| File                               | Purpose                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `agent/cloud-support-agent.yaml`   | Main agent configuration with instructions and tool definitions |
| `agent/tools/triage-api.yaml`      | OpenAPI spec for triage classification                          |
| `agent/tools/ticket-api.yaml`      | OpenAPI spec for ticket creation                                |
| `agent/tools/rag-openapi.yaml`     | OpenAPI spec for Azure AI Search RAG                            |
| `agent/tools/file-search-notes.md` | Guide for configuring File Search vector store                  |

## Troubleshooting

### Agent doesn't call tools
- Check that OpenAPI specs have correct URLs (no `{uniqueid}` placeholders)
- Verify function app is running: `az functionapp show -n func-agents-{id} -g rg-smart-agents-dev`
- Test endpoints directly: `curl https://func-agents-{id}.azurewebsites.net/api/triage -d '{"ticket_text":"test"}'`

### File Search returns no results
- Verify vector store is created in Foundry portal
- Check that documents are uploaded and indexed
- Ensure `vectorStore: auto` is set in agent YAML

### OpenAPI authentication fails
- Add function keys to OpenAPI specs or configure in Foundry portal
- Check that `x-functions-key` header is included in security schemes

### Agent hallucinates instead of using tools
- Review agent instructions in YAML
- Make instructions more explicit: "ALWAYS call triage first"
- Check tool descriptions are clear and specific

## What's Different from Other Demos?

| Demo        | Approach        | Tools                                      |
| ----------- | --------------- | ------------------------------------------ |
| Demo 02     | Local RAG       | Python function, local embeddings          |
| Demo 03     | SDK-based agent | Local Azure Functions, OpenAI SDK          |
| Demo 05     | Copilot Studio  | REST API endpoints, no agent orchestration |
| **Demo 08** | **Cloud Agent** | **Foundry orchestration, GA cloud tools**  |




## Resources

- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-studio/)
- [Agent YAML Schema](https://aka.ms/ai-foundry-vsc/agent/1.0.0)
- [File Search Tool Guide](https://learn.microsoft.com/azure/ai-studio/how-to/file-search)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
