# Demo 07: Multi-Agent Orchestration

A local multi-agent support system that demonstrates how different AI agents work together to handle support requests. **Accessible via the unified Fluent UI React interface** alongside Demo 06.

## Overview

This demo shows a **multi-agent orchestration** pattern where:
- **TriageAgent** classifies the request type (FAQ, RAG, Ticket, Unknown)
- **FaqAgent** answers from a hardcoded FAQ knowledge base
- **RagAgent** searches the Azure AI Search knowledge base (same as Demo 02)
- **TicketAgent** creates real support tickets in Azure Table Storage with `Status='Agent Created'`
- **Orchestrator** routes requests to the appropriate agents and updates tickets with AI responses

**Real ticket creation:** Unlike Demo 04 (which uses email), this demo creates tickets directly in Azure Table Storage with a special status that prevents automatic email replies.

## Architecture

```
User Question
    ↓
TriageAgent (classify intent)
    ↓
┌─────────┬──────────┬────────────┬──────────┐
│   FAQ   │   RAG    │   TICKET   │ UNKNOWN  │
↓         ↓          ↓            ↓
FaqAgent  RagAgent   TicketAgent  RagAgent
│         │          │    +       │
│         │          │  RagAgent  │
└─────────┴──────────┴────────────┴──────────┘
             ↓
    Orchestrated Response
```

## Prerequisites

Same infrastructure as demos 02-06:
- Azure OpenAI (GPT-5.1-chat deployment)
- Azure AI Search (kb-support index)
- Azure Table Storage (SupportTickets table)

## Setup

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Configure environment:**
   
   The `.env` file is automatically created during deployment via `deploy.ps1`. If you need to create it manually:
   
   ```powershell
   # .env should contain:
   AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-key-here
   AZURE_OPENAI_DEPLOYMENT=gpt-5-1-chat
   AZURE_AI_SEARCH_ENDPOINT=https://your-search.search.windows.net
   AZURE_AI_SEARCH_API_KEY=your-search-key
   AZURE_AI_SEARCH_INDEX=kb-support
   
   # Azure Table Storage (for real ticket creation)
   STORAGE_ACCOUNT_NAME=your-storage-account
   STORAGE_ACCOUNT_KEY=your-storage-key
   ```

## Usage

### Fluent UI React App (Recommended)

Access Demo 07 through the unified Fluent UI interface in Demo 06:

```powershell
# Navigate to Demo 06 directory
cd ..\06-agentic-retrieval

# Install dependencies (if not done)
npm install

# Start React app + API server
npm run ui:react
```

Open `http://localhost:5173` and click the **"Demo 07: Multi-Agent"** tab.

**Features:**
- ✨ **Real Microsoft Fluent UI components**
- 🎯 **Tabbed interface** to switch between Demo 06 and Demo 07
- 📊 **Visualize the agent flow**: See which agents handle your request
- 🎫 **Ticket creation display**: Shows ticket ID when created
- 📝 **Response ordering**: Triage → Ticket Created → Response → Agent Flow
- 🔄 **Real-time processing**: Watch agents work step-by-step

### Command Line

**Run the orchestrator with a question:**

```powershell
npm run dev -- "How do I reset my password?"
```

### Example Scenarios

**FAQ routing (simple questions):**
```powershell
npm run dev -- "How do I reset my password?"
# Output: TriageAgent → FaqAgent (if match) → RagAgent (fallback)
```

**RAG routing (complex questions):**
```powershell
npm run dev -- "My VPN keeps disconnecting every 5 minutes"
# Output: TriageAgent → RagAgent (searches knowledge base)
```

**Multi-agent complex query:**
```powershell
npm run dev -- "I need help with a complex VPN issue and my account is locked"
# Output: TriageAgent → RagAgent (high confidence answer)
```

**Ticket creation (billing issues):**
```powershell
npm run dev -- "I was charged twice on my invoice"
# Output: TriageAgent → TicketAgent (creates ticket with Status='Agent Created') 
#         → RagAgent (provides helpful info) → Updates ticket with AI response
```

**Example output:**
```
🎫 Ticket created: TKT-1763458836445-K3WMFP
   Status: Agent Created
   CreatedBy: Multi-Agent Orchestrator
   
💬 Response: To request a refund for duplicate charges, please contact our billing 
   department at billing@company.com with your invoice number...
   
🤖 Agent Flow: TriageAgent → TicketAgent → RagAgent
   
✅ Ticket updated with AI response (Confidence: 0.9)
```

**Support hours query:**
```powershell
npm run dev -- "What are your support hours?"
# Output: TriageAgent → RagAgent (retrieves from knowledge base)
```

## How It Works

The orchestrator follows this decision flow:

1. **TriageAgent** analyzes the question and classifies it as:
   - `FAQ` - Simple, factual questions
   - `RAG` - Complex questions requiring knowledge base search
   - `TICKET` - Issues requiring human escalation
   - `UNKNOWN` - Unclear intent (falls back to RAG)

2. **Routing logic:**
   - FAQ → Try FaqAgent first, fallback to RagAgent if no match
   - RAG → Search Azure AI Search knowledge base
   - TICKET → Create support ticket with `Status='Agent Created'` + provide RAG answer + update ticket with AI response and confidence
   - UNKNOWN → Default to RAG search

3. **Ticket creation details:**
   - Tickets are created in Azure Table Storage (`SupportTickets` table)
   - Special status `Status='Agent Created'` prevents Demo 04 email auto-reply workflow
   - Ticket format: `TKT-[timestamp]-[6-char-id]`
   - After RAG response, ticket is updated with `AIResponse` and `Confidence` fields
   - This demonstrates AI-assisted ticket handling without email integration

4. **Response assembly:**
   - Combines results from multiple agents
   - Returns unified response to user
   - Shows agent routing path for transparency

## Agent Behavior

### TriageAgent
**Input:** User message  
**Output:** `{ type, category, reason }`

Classification rules:
- Contains "refund", "billing", "charged", "subscription" → TICKET (Billing)
- Contains "urgent", "critical" → TICKET (Urgent)  
- Short question (<50 chars) with "how do i", "what is" → FAQ
- Long question or "problem", "issue", "not working" keywords → RAG
- Else → UNKNOWN

### FaqAgent
**Input:** User message  
**Output:** `{ text, confidence }`

FAQ Topics:
- Password reset
- VPN setup
- Office installation
- WiFi password
- Support hours

Returns confidence 1.0 for exact matches, 0 otherwise.

### RagAgent
**Input:** Question  
**Output:** `{ text, confidence, meta }`

Process:
1. Search Azure AI Search (top 5 results)
2. Pass results to Azure OpenAI
3. Generate answer using only KB content
4. Calculate confidence based on results found

### TicketAgent
**Input:** Message + optional category  
**Output:** `{ text, confidence, meta }`

Behavior:
- Creates real ticket in Azure Table Storage (SupportTickets table)
- Uses Status='Agent Created' to prevent Demo 04 email auto-replies
- Falls back to simulated tickets if storage not configured
- Returns ticket ID in response
- Ticket gets updated with RAG answer and confidence after creation

## Orchestration Logic

**FAQ Type:**
1. Call FaqAgent
2. If confidence ≥0.8 → Return FAQ answer
3. Else → Fall back to RagAgent

**RAG Type:**
1. Call RagAgent directly
2. Return KB answer

**TICKET Type:**
1. Call TicketAgent → Create real ticket in Table Storage
2. Call RagAgent → Get helpful info
3. Update ticket with AI response and confidence score
4. Return both ticket ID and KB answer

**UNKNOWN Type:**
1. Call RagAgent
2. If confidence <0.5 → Suggest human escalation
3. Return answer with caveat

## Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Multi-Agent Support System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 User: My VPN keeps disconnecting every 5 minutes

🔍 Step 1: Triaging request...
   Type: RAG
   Reason: Complex question or troubleshooting scenario

🔎 Step 2: Searching knowledge base...
   Confidence: 0.85
   Passages found: 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agents called: TriageAgent → RagAgent

🤖 Response:
To fix your VPN disconnection issue, try these steps:
1. Check your internet connection stability
2. Update your VPN client to the latest version
3. Change protocol from UDP to TCP in settings
4. Adjust MTU size to 1400 in advanced settings
5. Disable power saving for your network adapter

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Integration with Other Demos

- **Demo 01/05:** Uses same keyword-based triage logic
- **Demo 02:** Reuses RAG pattern and Azure AI Search index
- **Demo 04:** Creates tickets in same Table Storage but with Status='Agent Created' to avoid email auto-replies
- **Demo 06:** Could integrate agentic retrieval for better RAG

**Key Difference from Demo 04:** Tickets created by Demo 07 have `Status='Agent Created'` instead of `Status='New'`, which prevents the Demo 04 GraphWebhook function from sending auto-reply emails. This allows manual ticket creation without triggering the email workflow.

## How It Works

This is a **local orchestrator** - all agents run in one Node.js process:

1. **Single Entry Point:** `index.ts` orchestrates all agents
2. **Sequential Execution:** Agents called in logical order
3. **Fallback Logic:** If one agent fails, try another
4. **Clear Logging:** Shows decision-making process
5. **Graceful Degradation:** Simulates ticket creation if API unavailable

## Extending This Demo

Add more agents:
- **TranslationAgent** - Detect language and translate
- **SentimentAgent** - Detect frustration and escalate
- **HistoryAgent** - Track conversation context
- **RoutingAgent** - Route to specialized agents

Use a real orchestration framework:
- LangGraph
- Semantic Kernel
- AutoGen

## Development

```powershell
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run compiled version
npm start -- "Your question here"

# Development mode (auto-compile)
npm run dev -- "Your question here"
```

## Troubleshooting

**"Missing environment variable" error:**
- Check `.env` file has all required variables (including STORAGE_ACCOUNT_NAME and STORAGE_ACCOUNT_KEY)
- Verify Azure resources are deployed

**"No passages found" in RAG:**
- Ensure KB is ingested (run Demo 02 ingestion)
- Check Azure AI Search index name

**Ticket creation falls back to simulation:**
- Verify STORAGE_ACCOUNT_NAME and STORAGE_ACCOUNT_KEY are set in .env
- Check Table Storage connection string is valid
- Tickets will be simulated if storage credentials are missing (not an error)

---

**Key Takeaway:** Multi-agent systems shine when different types of requests need different handling strategies. The orchestrator routes intelligently based on triage classification.
