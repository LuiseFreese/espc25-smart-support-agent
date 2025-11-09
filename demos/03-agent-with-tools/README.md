# Demo 03: Agent with Tool Use

This demo shows an **autonomous agent** using Azure OpenAI function calling to execute actions via Azure Functions.

## Azure Resources Used

### 1. **Azure OpenAI Service** (`oai-agents-*`)
- **Purpose**: Provides the agent's reasoning and tool selection capabilities
- **Why**: GPT-4o-mini has native function calling support
- **How it's used**:
  - **Step 1**: User asks "Where is order 12345?"
  - **Step 2**: Model analyzes query, decides to call `GetOrderStatus` function
  - **Step 3**: Function executes, returns order data
  - **Step 4**: Model synthesizes natural language response
- **Feature**: Function calling (tool use) with JSON schema definitions
- **Cost**: ~$0.0003 per query (includes tool selection + final answer)

### 2. **Azure Functions** (`func-agents-*`)
- **Purpose**: Serverless HTTP endpoints that execute business logic
- **Why**: Scalable, pay-per-execution tools for the agent
- **How it's used**:
  - **GetOrderStatus**: Queries order database, returns status/tracking
  - **CreateTicket**: Creates support ticket in ticketing system
  - **Authentication**: API key validation via function keys
  - **Logging**: Each call logged to Application Insights
- **Hosting Plan**: Consumption (Y1) - only pay when called
- **Cost**: ~$0.000001 per execution (nearly free for low volume)

### 3. **Application Insights** (`appi-smart-agents-*`)
- **Purpose**: End-to-end observability for agent + tool calls
- **Why**: Debug failures, track latency, monitor token usage
- **What's tracked**:
  - Agent decision: Which tool was selected and why
  - Tool execution: Duration, success/failure, response size
  - Error traces: Full stack traces for failed calls
  - Custom metrics: Token count, confidence scores
- **Correlation**: Single correlation ID spans entire agent workflow

### 4. **Key Vault** (`kv-agents-*`)
- **Purpose**: Secure storage for API keys and secrets
- **Why**: Never hardcode credentials in function code
- **How it's used**:
  - Stores Azure OpenAI API key
  - Stores function app keys
  - Function code reads secrets via Key Vault references
  - Managed Identity for passwordless access

## Overview

- **Agent**: TypeScript client using Azure OpenAI Chat Completions with function calling
- **Tools**: Azure Functions exposing `GetOrderStatus` and `CreateTicket`
- **Flow**: User query → Model decides tool usage → Execute function → Model synthesizes final answer

## Architecture

```
User Query: "Where is my order 12345?"
    ↓
┌──────────────────────────────────────────────┐
│ Azure OpenAI (gpt-4o-mini)                   │
│ Analyzes query, sees "order" + number        │
│ Decision: Call GetOrderStatus(orderId=12345) │
└──────────────┬───────────────────────────────┘
               │ Function call request
               ▼
┌──────────────────────────────────────────────┐
│ Azure Function: GetOrderStatus               │
│ GET /api/GetOrderStatus?orderId=12345        │
│ → Queries order DB                           │
│ → Returns: {status: "shipped", tracking: ...}│
└──────────────┬───────────────────────────────┘
               │ Function result
               ▼
┌──────────────────────────────────────────────┐
│ Azure OpenAI (gpt-4o-mini)                   │
│ Synthesizes natural language response        │
│ "Your order is shipped! Tracking: UPS12345"  │
└──────────────────────────────────────────────┘
    ↓
User Response (with Application Insights tracking entire flow)
```

## Part 1: Azure Functions (Tools)

### Setup

```powershell
cd function-tool
npm install

# Copy local settings
cp local.settings.json.example local.settings.json
```

### Configure `local.settings.json`

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "<from .env>",
    "AZURE_OPENAI_ENDPOINT": "<from .env>",
    "AZURE_OPENAI_API_KEY": "<from .env>"
  }
}
```

### Start Functions Locally

```powershell
npm start
```

Expected output:
```
Functions:
  GetOrderStatus: [GET] http://localhost:7071/api/GetOrderStatus
  CreateTicket: [POST] http://localhost:7071/api/CreateTicket
```

### Test Functions

```powershell
# Get order status
Invoke-RestMethod -Uri "http://localhost:7071/api/GetOrderStatus?orderId=12345"

# Create ticket
$body = @{
    title = "VPN connection issues"
    description = "VPN disconnects every 5 minutes"
    customerId = "CUST-001"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:7071/api/CreateTicket" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Expected Results**:
- **GetOrderStatus**: `{"orderId":"12345","status":"In Transit","eta":"2025-11-15","trackingNumber":"TRK-98765-ABCD"}`
- **CreateTicket**: `{"ticketId":"TKT-5678","status":"created","createdAt":"2024-11-09T18:30:00Z"}`

## Part 2: Agent Client

### Setup

```powershell
cd ..\agent
npm install
```

### Configure Environment

Ensure `.env` in workspace root contains:

```env
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_FUNCTION_APP_URL=http://localhost:7071/api
```

### Run Agent

**IMPORTANT**: Azure Functions must be running (see Part 1) before starting the agent!

```powershell
# Query order status
npm run dev -- "Where is order 12345?"

# Create a ticket
npm run dev -- "Create a support ticket for customer CUST-001 about VPN disconnecting every 5 minutes"

# Complex multi-step query
npm run dev -- "Check order 67890 and if it's not delivered, create a ticket"
```

### Expected Output

```
💬 User: Where is order 12345?

🤖 Processing...

🔧 Executing tool: getOrderStatus
   Arguments: { orderId: '12345' }
   Result: {
  orderId: '12345',
  status: 'In Transit',
  eta: '2025-11-15',
  trackingNumber: 'TRK-98765-ABCD',
  items: [ 'Laptop Stand', 'Wireless Mouse' ]
}

✅ Assistant: Your order 12345 is currently in transit. The expected delivery date is November 15, 2025. The tracking number is TRK-98765-ABCD. Your order includes a Laptop Stand and a Wireless Mouse.
```

### How It Works (Under the Hood)

1. **User Query**: "Where is my order 12345?"

2. **Agent Decision** (Azure OpenAI function calling):
   ```json
   {
     "tool_calls": [{
       "function": {
         "name": "GetOrderStatus",
         "arguments": "{\"orderId\":\"12345\"}"
       }
     }]
   }
   ```

3. **Function Execution**: Agent calls `http://localhost:7071/api/GetOrderStatus?orderId=12345`

4. **Function Response**: `{"orderId":"12345","status":"In Transit","eta":"2025-11-15","trackingNumber":"TRK-98765-ABCD"}`

5. **Final Answer** (Azure OpenAI synthesis):
   > "Your order 12345 is currently in transit. Expected delivery: November 15, 2025. Tracking: TRK-98765-ABCD."

### Cost Analysis

**Per Agent Interaction**:
- **Input tokens**: ~200 tokens (query + tool definitions + context)
- **Output tokens**: ~150 tokens (tool call + final answer)
- **Azure OpenAI cost**: ~$0.0004 per query (gpt-4o-mini: $0.150 input + $0.600 output per 1M tokens)
- **Azure Functions cost**: ~$0.000001 per function call (consumption plan)
- **Total**: ~$0.0004 per agent interaction

**Monthly (10K agent queries)**:
- **OpenAI**: $4.00
- **Functions**: $0.01 (consumption plan, nearly free)
- **App Insights**: ~$5.00 (5GB ingestion)
- **Total**: ~$9/month for 10K agent interactions

**ROI Calculation**:
- **Manual support cost**: $10/ticket (5 min × $120/hr agent salary)
- **Agent cost**: $0.0004/interaction
- **Automation rate**: 30% of queries fully resolved without human intervention
- **Monthly savings (10K queries)**: 
  - Automated: 3,000 tickets × ($10 - $0.0004) = **$29,999**
  - Human fallback: 7,000 tickets × $10 = $70,000 (unchanged)
  - **Net savings**: ~$30K/month from 30% deflection

## Tool Definitions

### GetOrderStatus

- **Method**: GET
- **Parameter**: `orderId` (string)
- **Returns**: Order status, ETA, tracking number, items

### CreateTicket

- **Method**: POST
- **Parameters**:
  - `title` (string) - Issue summary
  - `description` (string) - Detailed problem
  - `customerId` (string) - Customer ID
- **Returns**: Ticket ID, status, priority, created timestamp

## File Structure

```
03-agent-with-tools/
├── function-tool/              # Azure Functions
│   ├── host.json
│   ├── local.settings.json.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── openapi.yaml           # API specification
│   └── src/
│       ├── GetOrderStatus/
│       │   └── index.ts
│       └── CreateTicket/
│           └── index.ts
└── agent/                      # Agent client
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── call-agent.ts      # Function calling loop
```

## Deploy to Azure

### Deploy Functions

```bash
cd function-tool
npm run build

# Deploy
func azure functionapp publish <function-app-name>
```

### Update Agent Configuration

Update `.env` with production URL:

```env
AZURE_FUNCTION_APP_URL=https://func-agents-<suffix>.azurewebsites.net/api
```

## Monitoring

All tool executions emit custom events to Application Insights:

- `OrderStatusRetrieved` - When order status is fetched
- `TicketCreated` - When support ticket is created

Query in Application Insights:

```kql
customEvents
| where name in ("OrderStatusRetrieved", "TicketCreated")
| project timestamp, name, customDimensions
| order by timestamp desc
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Functions won't start | Run `func start --verbose` to see errors |
| Agent can't reach functions | Verify `AZURE_FUNCTION_APP_URL` is correct |
| Tool calls fail | Check function responses are valid JSON |
| Max iterations error | Model is stuck in loop - improve system prompt |

## Extension Ideas

Add more tools:
1. **UpdateOrderAddress** - Change delivery address
2. **CancelOrder** - Cancel pending order
3. **SearchKnowledgeBase** - Call RAG flow from Demo 02
4. **EscalateToHuman** - Route to human agent

Update `openapi.yaml` and create corresponding Functions.
