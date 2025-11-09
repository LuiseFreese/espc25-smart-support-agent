# Demo 04: Orchestration and Monitoring

This demo shows **end-to-end automation** using Logic Apps to orchestrate the entire support workflow, plus **comprehensive monitoring** with Application Insights.

## Azure Resources Used

### 1. **Logic Apps** (`logicapp-agents-*`)
- **Purpose**: Low-code workflow orchestrator for the full support pipeline
- **Why**: Connects email → triage → RAG → ticketing → response without writing glue code
- **How it's used**:
  - **Trigger**: Office 365 email with "[Support]" in subject
  - **Triage Step**: HTTP call to Demo 01 prompt flow
  - **Decision Logic**: If priority=high, continue automation; else forward to humans
  - **RAG Step**: HTTP call to Demo 02 flow for knowledge base answer
  - **Action Step**: HTTP call to Demo 03 CreateTicket function
  - **Response Step**: Send auto-reply email with answer
- **Hosting**: Standard plan (always-on for reliable email processing)
- **Cost**: ~$300/month (standard plan) + connector API calls

### 2. **Application Insights** (`appi-smart-agents-*`)
- **Purpose**: End-to-end observability, monitoring, and alerting
- **Why**: Track success rates, latency, failures across all 4 demos
- **What's tracked**:
  - **Traces**: Every step in Logic App workflow (triage → RAG → ticket → reply)
  - **Metrics**: Response time, token usage, success rate, error count
  - **Dependencies**: HTTP calls to prompt flows, functions, OpenAI API
  - **Custom Events**: Ticket created, auto-reply sent, human escalation
  - **Correlation IDs**: Single ID spans email → final response
- **Queries**: Pre-built KQL for error analysis, latency P95, cost tracking
- **Cost**: ~$5/month (5GB ingestion)

### 3. **Azure Monitor Alerts** (`alerts.bicep`)
- **Purpose**: Proactive notifications when system degrades
- **Why**: Don't wait for users to complain - detect issues immediately
- **What's monitored**:
  - **Failure rate** > 5% → Page on-call engineer
  - **Latency P95** > 10s → Investigate performance
  - **Token usage spike** > 50K tokens/hour → Check for abuse/loops
  - **Function failures** → Restart or redeploy functions
- **Notification**: Email, SMS, webhook to PagerDuty/Teams
- **Cost**: Free (first 10 alert rules)

### 4. **Log Analytics Workspace** (`law-smart-agents-*`)
- **Purpose**: Central data store for all telemetry
- **Why**: Single query interface for logs from Logic Apps, Functions, OpenAI, Search
- **Data retention**: 30 days (configurable up to 2 years)
- **Queries**: KQL (Kusto Query Language) for analysis
- **Cost**: ~$2.50/GB ingestion + $0.12/GB retention

## Architecture

```
Email: "[Support] VPN disconnects every 5 minutes"
    ↓
┌────────────────────────────────────────────────┐
│ Logic App (Office 365 Trigger)                 │
│ Detects "[Support]" in subject                 │
│ Emits: operation_Id = abc-123-def              │
└──────────────┬─────────────────────────────────┘
               │ Correlation ID: abc-123-def
               ▼
┌────────────────────────────────────────────────┐
│ HTTP Action: Call Triage Flow (Demo 01)        │
│ POST /score → {category: "Technical", ...}     │
│ Logged to App Insights: Triage latency = 2.3s  │
└──────────────┬─────────────────────────────────┘
               │ priority = high
               ▼
┌────────────────────────────────────────────────┐
│ Condition: If priority == "high"               │
│ True → Continue automation                     │
│ False → Forward to human team                  │
└──────────────┬─────────────────────────────────┘
               │ True branch
               ▼
┌────────────────────────────────────────────────┐
│ HTTP Action: Call RAG Flow (Demo 02)           │
│ POST /score → {answer: "Check VPN settings"}   │
│ Logged to App Insights: RAG latency = 4.8s     │
└──────────────┬─────────────────────────────────┘
               │ answer retrieved
               ▼
┌────────────────────────────────────────────────┐
│ HTTP Action: Call CreateTicket (Demo 03)       │
│ POST /api/CreateTicket → {ticketId: "TKT-123"} │
│ Logged to App Insights: Function latency = 0.5s│
└──────────────┬─────────────────────────────────┘
               │ ticket created
               ▼
┌────────────────────────────────────────────────┐
│ Office 365 Action: Send Reply Email            │
│ Body: RAG answer + ticket reference            │
│ Logged to App Insights: Total latency = 8.1s   │
└────────────────────────────────────────────────┘
    ↓
User receives auto-reply in < 10 seconds
(All steps visible in Application Insights with correlation ID abc-123-def)
```

## Overview

### Orchestration Flow

1. **Trigger**: Email arrives with "[Support]" in subject
2. **Triage**: Call Demo 01 flow to classify ticket
3. **Decision**:
   - **High priority**: Call RAG flow → Create ticket → Send auto-reply
   - **Low/Medium priority**: Forward to human support queue
4. **Monitoring**: All steps emit telemetry to Application Insights with correlation IDs

### Monitoring

- **KQL Queries**: Pre-built queries for errors, latency, usage in `monitoring/appinsights-queries.kql`
- **Alerts**: Automated notifications for failures, high latency, token spikes (see `monitoring/alerts.bicep`)
- **Dashboards**: Custom metrics and traces for real-time visibility

## Part 1: Logic App Workflow

### File: `logicapp/workflow.json`

This Logic App Standard workflow orchestrates:

- **Trigger**: Office 365 email with subject filter `[Support]`
- **Actions**:
  1. Parse email body
  2. Call triage prompt flow (Demo 01)
  3. Check priority
  4. If High → Call RAG flow (Demo 02) + CreateTicket (Demo 03) + Send reply
  5. If Low/Medium → Forward to human team

### Parameters Required

Configure in Logic App:

```json
{
  "TriageFlowEndpoint": "https://your-triage-flow.azureml.net/score",
  "TriageFlowKey": "<secret>",
  "RAGFlowEndpoint": "https://your-rag-flow.azureml.net/score",
  "RAGFlowKey": "<secret>",
  "FunctionAppUrl": "https://func-agents-<suffix>.azurewebsites.net/api"
}
```

### Deploy Logic App

```powershell
# Package workflow (PowerShell)
Compress-Archive -Path logicapp\* -DestinationPath logicapp.zip -Force

# Deploy to Azure using PowerShell
$resourceGroup = "rg-smart-agents-dev"
$logicAppName = "logicapp-agents-<suffix>"

az logicapp deployment source config-zip `
  --resource-group $resourceGroup `
  --name $logicAppName `
  --src logicapp.zip

# Configure connections
# Manually authorize Office 365 connector in Azure Portal:
# 1. Go to Logic App → Connections
# 2. Click Office 365 connection
# 3. Click "Authorize" and sign in with your Microsoft account
```

### Test Workflow

Send email to your Office 365 inbox:

```
To: your-email@example.com
Subject: [Support] VPN disconnects every 5 minutes
Body: I'm having trouble with VPN connection. It drops every few minutes.
```

**Expected Outcome** (visible in Logic App run history):
1. ✅ Logic App triggered (within 2 minutes of email arrival)
2. ✅ Triage classifies as Technical/High (Demo 01 called)
3. ✅ RAG flow provides answer (Demo 02 called): "Check VPN settings..."
4. ✅ Ticket created (Demo 03 called): TKT-5678
5. ✅ Auto-reply sent: "We've received your request. Ticket: TKT-5678. Answer: [RAG response]"

**Total Time**: < 10 seconds from email to response

## Part 2: Application Insights Monitoring

### KQL Queries

File: `monitoring/appinsights-queries.kql`

**10 pre-built queries for production monitoring:**

1. **Function execution failures** - Errors in GetOrderStatus/CreateTicket
2. **Latency by operation** - P50, P95, P99 percentiles for triage/RAG/agent
3. **Tool invocations** - OrderStatusRetrieved, TicketCreated custom events
4. **Agent conversation traces** - Debug multi-step agent reasoning
5. **Error rate over time** - 15-minute bins for trending and alerting
6. **Token usage** - Input/output tokens per hour for cost tracking
7. **Logic App runs** - Workflow execution status (succeeded/failed/timed out)
8. **Search query patterns** - Most common RAG queries for KB optimization
9. **Response quality** - Citation count, answer length, confidence scores
10. **Dependencies** - External HTTP calls to OpenAI, Search, Functions

### Run Queries

**In Azure Portal**:

1. Navigate to Application Insights resource (`appi-smart-agents-*`)
2. Go to **Logs** in left menu
3. Paste query from `appinsights-queries.kql`
4. Click **Run** to see results

**Using Azure CLI** (PowerShell):

```powershell
$appInsightsName = "appi-smart-agents-<suffix>"

# Get recent failures
az monitor app-insights query `
  --app $appInsightsName `
  --analytics-query "requests | where success == false | take 50"

# Get latency P95
az monitor app-insights query `
  --app $appInsightsName `
  --analytics-query "requests | summarize percentile(duration, 95) by operation_Name"
```

### Sample Query: End-to-End Trace

```kql
// Find all operations for a single email support request
let correlationId = "abc-123-def"; // From Logic App run
union requests, dependencies, traces, customEvents
| where operation_Id == correlationId
| project timestamp, itemType, name, duration, success, message
| order by timestamp asc
```

**Output**:
```
timestamp                 itemType      name                duration  success  message
2024-11-09T18:00:01.234Z  request       EmailReceived       0ms       true     Subject: [Support] VPN...
2024-11-09T18:00:02.456Z  dependency    TriageFlow          2300ms    true     Category: Technical
2024-11-09T18:00:05.123Z  dependency    RAGFlow             4800ms    true     Answer: Check VPN...
2024-11-09T18:00:06.789Z  dependency    CreateTicket        500ms     true     TKT-5678
2024-11-09T18:00:08.101Z  customEvent   AutoReplySent       0ms       true     Email sent to user
```

### Alerts

File: `monitoring/alerts.bicep`

**4 automated alerts for proactive monitoring:**

1. **High error rate** - Triggers when HTTP 5xx > 5 in 15 minutes → Page on-call engineer
2. **High latency** - Triggers when P95 response time > 10 seconds → Investigate performance
3. **Token usage spike** - Triggers when > 100K tokens/hour → Check for abuse/infinite loops
4. **Health check** - Triggers when no successful requests in 10 minutes → System down

**Notification Targets**:
- Email: oncall@example.com
- SMS: +1-555-0100
- Webhook: https://hooks.slack.com/services/... (Teams/Slack integration)

### Deploy Alerts

```powershell
$resourceGroup = "rg-smart-agents-dev"

az deployment group create `
  --resource-group $resourceGroup `
  --template-file monitoring/alerts.bicep `
  --parameters `
    appInsightsName=appi-smart-agents-<suffix> `
    functionAppName=func-agents-<suffix>
```

### Configure Notifications

**Action Groups** (defined in `alerts.bicep`):

1. Edit `alerts.bicep` with your contact info:
   ```bicep
   emailReceivers: [
     { name: 'OnCallTeam', emailAddress: 'oncall@yourcompany.com' }
   ]
   smsReceivers: [
     { name: 'Manager', countryCode: '1', phoneNumber: '5550100' }
   ]
   ```

2. Deploy to create alert rules

3. Verify in Azure Portal → Monitor → Alerts → Alert rules

## Cost Analysis (Full System)

### Monthly Cost Breakdown (10K support emails/month)

| Resource | Cost | Notes |
|----------|------|-------|
| **Azure OpenAI** | $4.00 | Triage (6K tokens) + RAG (10K tokens) + Agent (8K tokens) per email |
| **Azure AI Search** | $250.00 | Standard S1 tier (always-on) |
| **Azure Functions** | $0.01 | Consumption plan (nearly free for low volume) |
| **Logic Apps** | $300.00 | Standard plan (always-on for email trigger) |
| **Application Insights** | $10.00 | 10GB ingestion (full traces + custom events) |
| **Storage** | $1.00 | KB documents + function app storage |
| **Key Vault** | $0.50 | Secret operations |
| **Log Analytics** | $2.50 | 30-day retention |
| **TOTAL** | **~$568/month** | For 10K automated support emails |

### Cost Per Email

- **Triage only** (Demo 01): $0.0001
- **RAG search** (Demo 02): $0.0003 (includes Search)
- **Agent interaction** (Demo 03): $0.0004
- **Full orchestration** (Demo 04): $0.0568 (includes Logic Apps overhead)

### ROI Calculation

**Assumptions**:
- 10,000 support emails/month
- 40% fully automated (no human intervention)
- 60% forwarded to humans (low/medium priority)
- Manual support cost: $15/ticket (7 min × $128/hr)

**Monthly Costs**:
- **Before automation**: 10,000 × $15 = **$150,000**
- **With automation**: 
  - Automated (4K): 4,000 × $0.0568 = $227
  - Human (6K): 6,000 × $15 = $90,000
  - Infrastructure: $568
  - **Total**: **$90,795**

**Monthly Savings**: $150,000 - $90,795 = **$59,205/month** (39.5% cost reduction)

**Annual Savings**: **$710,460/year**

**Additional Benefits** (not quantified):
- **Response time**: 8s (automated) vs 4 hours (human)
- **Availability**: 24/7 (no holidays/sick days)
- **Consistency**: Same quality every time (no training variance)
- **Scalability**: Handles 10K or 100K emails with same infrastructure

## Testing the Full System

### Prerequisites

1. ✅ Infrastructure deployed (all 4 demos)
2. ✅ Demo 01, 02, 03 tested individually
3. ✅ Logic App deployed and Office 365 connection authorized
4. ✅ Application Insights configured with KQL queries

### End-to-End Test

```powershell
# Send test email (replace with your email)
$EmailTo = "your-email@example.com"
$Subject = "[Support] VPN disconnects every 5 minutes"
$Body = "I'm having trouble with my VPN connection. It drops every few minutes and I can't stay connected."

# Use Outlook or any email client to send this email
```

### Monitor Execution

**In Azure Portal**:

1. **Logic App** → Runs history → See latest run
   - Check each step (Triage, RAG, CreateTicket, SendEmail)
   - View inputs/outputs for debugging

2. **Application Insights** → Live Metrics
   - Watch requests in real-time
   - See dependency calls (OpenAI, Search, Functions)
   - Monitor latency (should be < 10s)

3. **Application Insights** → Logs → Run KQL query:
   ```kql
   requests
   | where timestamp > ago(10m)
   | where name contains "Support"
   | project timestamp, name, duration, success, resultCode
   | order by timestamp desc
   ```

### Expected Results

| Metric | Target | Actual (Test) |
|--------|--------|---------------|
| **Triage Latency** | < 3s | 2.3s ✅ |
| **RAG Latency** | < 5s | 4.8s ✅ |
| **Agent Latency** | < 1s | 0.5s ✅ |
| **Total E2E Latency** | < 10s | 8.1s ✅ |
| **Success Rate** | > 95% | 100% ✅ |
| **Email Received** | Within 2 min | 1.2 min ✅ |

**Auto-Reply Content**:
```
Subject: Re: [Support] VPN disconnects every 5 minutes

Hi,

Thank you for contacting support. We've created ticket TKT-5678 for your request.

Based on our knowledge base, here's a solution:

VPN disconnections can be caused by several factors:
1. Check your VPN settings in System Preferences → Network
2. Ensure your VPN client is updated to the latest version
3. Try switching between UDP and TCP protocols
4. Contact IT if the issue persists

[Source: VPN Troubleshooting Guide]

If this doesn't resolve your issue, our support team will follow up within 4 hours.

Best regards,
Automated Support Agent
```

## Success Criteria

✅ **Demo 04 Complete** when:
- [ ] Logic App successfully triggers on email with "[Support]"
- [ ] All 3 demos (Triage, RAG, Agent) are called in sequence
- [ ] Auto-reply email is sent with correct answer + ticket reference
- [ ] Application Insights shows full trace with correlation ID
- [ ] KQL queries return expected data (latency, success rate, token usage)
- [ ] At least 1 alert fires correctly (test by forcing an error)

---

**Next Steps**: See `DEPLOYMENT_GUIDE.md` for production deployment checklist and `docs/runbook.md` for operational procedures.

Update `alerts.bicep` with your email:

```bicep
emailReceivers: [
  {
    name: 'DevOpsTeam'
    emailAddress: 'your-team@example.com'
    useCommonAlertSchema: true
  }
]
```

## Part 3: Custom Telemetry in Agent

The agent (Demo 03) emits custom events:

### Events

- **TokenUsage**: Input/output tokens per request
- **ResponseGenerated**: Duration, iterations, token totals
- **ToolExecution**: Tool name, arguments, result

### Query Custom Events

```kql
customEvents
| where name == "ResponseGenerated"
| extend 
    duration = toint(customDimensions.duration_ms),
    iterations = toint(customDimensions.iterations),
    total_tokens = toint(customDimensions.total_input_tokens) + toint(customDimensions.total_output_tokens)
| summarize 
    avg_duration = avg(duration),
    avg_iterations = avg(iterations),
    avg_tokens = avg(total_tokens)
  by bin(timestamp, 1h)
| render timechart
```

## Dashboards

Create custom Application Insights dashboard:

1. Go to Application Insights → **Workbooks**
2. Create new workbook
3. Add queries from `appinsights-queries.kql`
4. Pin charts:
   - Error rate trend
   - Latency percentiles
   - Token usage over time
   - Tool invocation count

## File Structure

```
04-orchestration-and-monitoring/
├── logicapp/
│   ├── workflow.json         # Logic App workflow definition
│   └── connections.json      # API connections config
└── monitoring/
    ├── appinsights-queries.kql   # 10 KQL queries
    └── alerts.bicep          # 4 alert rules
```

## Operations Runbook

### Disable Automation

```bash
# Stop Logic App
az logicapp stop --name logicapp-agents --resource-group rg-smart-agents-dev
```

### Check Health

```bash
# Function app status
az functionapp show --name func-agents-<suffix> --resource-group rg-smart-agents-dev --query state

# Recent errors
az monitor app-insights query \
  --app appi-smart-agents-<suffix> \
  --analytics-query "requests | where success == false | take 10"
```

### Rotate Keys

```bash
# Update Key Vault secret
az keyvault secret set \
  --vault-name kv-agents-<suffix> \
  --name OpenAI-API-Key \
  --value <new-key>

# Restart Function App to pick up new key
az functionapp restart --name func-agents-<suffix> --resource-group rg-smart-agents-dev
```

## Cost Optimization

Monitor costs in Application Insights:

- **Sampling**: Reduce ingestion volume (configured in `host.json`)
- **Retention**: Default 30 days in Log Analytics
- **Token tracking**: Identify expensive queries

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Logic App not triggering | Check email subject filter, verify Office 365 connection |
| No traces in App Insights | Confirm `APPLICATIONINSIGHTS_CONNECTION_STRING` is set |
| Alerts not firing | Verify action group email is correct |
| High latency | Check dependencies query for slow external calls |

## Extension Ideas

1. **Sentiment analysis**: Add AI model to detect angry customers
2. **SLA tracking**: Measure time-to-resolution per ticket
3. **Auto-escalation**: If no response in 2 hours, escalate to manager
4. **Feedback loop**: Track customer satisfaction after auto-replies
