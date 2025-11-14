# Demo 01: Ticket Triage with Prompt Flow

This demo shows how to use **Azure OpenAI** to classify incoming support tickets by category and priority using a prompt flow orchestration pattern.

## Azure Resources Used

### 1. **Azure OpenAI Service** (`oai-agents-*`)
- **Purpose**: Runs the GPT-4o-mini model for intelligent ticket classification
- **Why**: Provides the LLM capability to understand ticket text and classify it
- **How it's used**:
  - Receives ticket text as user prompt
  - Applies system prompt with classification rules
  - Returns structured JSON: `{"category": "...", "priority": "..."}`
- **Model**: `gpt-4o-mini` (2024-07-18) - Fast, cost-effective for classification
- **Cost**: ~$0.0001 per ticket (150 tokens input + 50 tokens output)

### 2. **Application Insights** (Optional - for production)
- **Purpose**: Tracks prompt flow execution metrics
- **Why**: Monitor latency, token usage, classification accuracy
- **How it's used**:
  - Logs each classification request with correlation ID
  - Tracks P50/P95 latency (target: <2 seconds)
  - Monitors error rates and retries

## Overview

- **Input:** Support ticket text (string)
- **Output:** JSON with `category` and `priority`
- **Categories:** Billing, Technical, Account, Access
- **Priorities:** High, Medium, Low
- **Latency:** <2 seconds (P95)

## How It Works

```
┌─────────────────┐
│ Ticket Text     │  "VPN disconnects every 5 minutes"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ System Prompt   │  "You are a ticket classification system..."
│ (system.jinja2) │  Rules: Categories, Priority criteria
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Azure OpenAI    │  Model: gpt-4o-mini
│ GPT-4o-mini     │  Endpoint: oai-agents-*.openai.azure.com
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ JSON Response   │  {"category": "Technical", "priority": "Medium"}
└─────────────────┘
```

## Prerequisites

```powershell
# Install dependencies
pip install -r requirements.txt

# Or use the test scripts directly
python ../../test-demo01.py
python ../../test-multiple-tickets.py
```

Configure environment variables in `.env`:

```env
AZURE_OPENAI_ENDPOINT=https://oai-agents-*.openai.azure.com/
AZURE_OPENAI_API_KEY=<from deployment outputs>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

## Create Azure OpenAI Connection

```bash
pf connection create --file connection.yaml --name azure_openai_connection
```

Or create `connection.yaml`:

```yaml
$schema: https://azuremlschemas.azureedge.net/promptflow/latest/AzureOpenAIConnection.schema.json
name: azure_openai_connection
type: azure_open_ai
api_key: ${env:AZURE_OPENAI_API_KEY}
api_base: ${env:AZURE_OPENAI_ENDPOINT}
api_type: azure
api_version: ${env:AZURE_OPENAI_API_VERSION}
```

## Run Tests

### Option 1: Direct Python Script (Recommended)

```powershell
# Single ticket test
python ../../test-demo01.py

# Multiple scenarios (6 tickets)
python ../../test-multiple-tickets.py
```

### Option 2: Using Prompt Flow CLI (if available)

```bash
pf flow test -f flow.dag.yaml \
  --inputs ticket_text="VPN disconnects every 5 minutes"
```

## Expected Output

```json
{
  "category": "Technical",
  "priority": "Medium"
}
```

## Cost Analysis

**Per Ticket Classification:**
- Input tokens: ~150 (system prompt + ticket text)
- Output tokens: ~50 (JSON response)
- Cost: ~$0.0001 per classification (gpt-4o-mini pricing)

**Monthly Volume (10,000 tickets):**
- Total cost: ~$1.00/month
- Latency: <2s per ticket (P95)
- Savings: Replaces 15-20 minutes of manual triage = **99% time reduction**

Expected output:

```json
{
  "category": "Technical",
  "priority": "Medium"
}
```

## Run Evaluation Dataset

```bash
pf flow test -f flow.dag.yaml --inputs data/eval.jsonl
```

## Validate Flow

```bash
pf flow validate -f flow.dag.yaml
```

## Deploy to Azure AI Foundry

```bash
# Build flow
pf flow build --source . --output dist --format docker

# Deploy
pf flow deploy --source dist --name ticket-triage
```

## Evaluation

To measure classification accuracy:

```bash
cd eval
pf flow test -f eval_flow.dag.yaml --inputs ../data/eval.jsonl
```

The evaluation flow compares predicted vs expected labels and computes accuracy.

## File Structure

```
01-triage-promptflow/
├── flow.dag.yaml           # Prompt flow definition
├── prompts/
│   ├── system.jinja2       # System prompt with classification rules (reference)
│   └── classify.jinja2     # User message template (includes system prompt)
├── data/
│   └── eval.jsonl          # Test dataset with 8 examples
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## Validation Results

**Test Date**: November 14, 2025

### ✅ Classification Testing

Tested LLM-based classification with 5 diverse support scenarios using Azure OpenAI (`gpt-4o-mini`).

#### Test Results

| Test Case | Category | Priority | Status |
|-----------|----------|----------|---------|
| My VPN disconnects every 5 minutes | Technical | Medium | ✅ Perfect |
| I can't reset my password, account is locked | Account | High | ✅ Perfect |
| I was charged twice for my subscription | Billing | High | ⚠️ Priority: Expected Medium |
| Need access to the Finance shared folder | Access | Medium | ✅ Perfect |
| URGENT: Entire office lost internet connection | Technical | High | ✅ Perfect |

**Accuracy Metrics**:
- **Category Accuracy**: 100% (5/5 correct)
- **Priority Accuracy**: 80% (4/5 correct)
- **Fully Correct**: 80% (4/5 both fields correct)

**Notes**:
- ⚠️ Billing test: LLM classified as "High" priority instead of expected "Medium". This is actually reasonable since being charged twice could be urgent for some users. The classification rules may need refinement for edge cases.
- ✅ All categories classified correctly (Technical, Account, Billing, Access)
- ✅ System prompt effectively guides the model to structured JSON output

### 🔍 Observations

**What's Working**:
- ✅ Structured JSON output with `response_format: json_object`
- ✅ Zero temperature ensures deterministic results
- ✅ Clear classification rules in system prompt
- ✅ Fast response time (<1 second per classification)
- ✅ Cost-effective: ~$0.0001 per ticket

**Prompt Flow Notes**:
- ⚠️ Flow definition exists (`flow.dag.yaml`) but **not deployed to Azure AI Foundry**
- ✅ Classification logic validated using direct Azure OpenAI SDK calls
- ✅ Jinja2 templates updated (system prompt embedded in classify.jinja2)
- 📝 To deploy: Use Azure AI Foundry portal or `az ml` CLI commands

### 📝 Test Command

```bash
# Python SDK test (current validation method)
python tests/test-demo01-triage.py

# Prompt Flow test (requires Prompt Flow CLI setup)
# pf flow test -f demos/01-triage-promptflow/flow.dag.yaml \
#   --inputs ticket_text='VPN disconnects every 5 minutes'
```

### ✅ Production Status

**Current State**: Demo 01 classification logic is **FULLY FUNCTIONAL** but **not deployed as Prompt Flow**.

**Verified Components**:
- ✅ Azure OpenAI model (`gpt-4o-mini`) working
- ✅ System prompt with clear classification rules
- ✅ JSON structured output
- ✅ High classification accuracy (100% category, 80% priority)

**Usage in Demo 04b**:
- Demo 04b currently uses **keyword-based triage** (100% accuracy on specific test cases)
- This LLM-based approach could replace keyword matching for better handling of edge cases
- Trade-off: Higher cost (~$0.0001/ticket) vs better accuracy on ambiguous tickets

### 🔄 Deployment to Prompt Flow (Optional)

To deploy this as a Prompt Flow in Azure AI Foundry:

```bash
# 1. Create workspace connection
az ml connection create --file connection.yaml --workspace-name aiproject-agents-*

# 2. Deploy flow
az ml online-deployment create \
  --file demos/01-triage-promptflow/deployment.yaml \
  --endpoint-name triage-endpoint

# 3. Test deployed endpoint
az ml online-endpoint invoke \
  --name triage-endpoint \
  --request-file demos/01-triage-promptflow/test-request.json
```

**When to deploy**:
- Need for A/B testing different prompts
- Want centralized prompt versioning
- Require detailed observability/monitoring
- Building evaluation pipelines

**When to skip**:
- Direct SDK calls sufficient (as in Demo 04b)
- Simple single-prompt scenarios
- Cost-sensitive applications (avoid Prompt Flow overhead)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection error | Verify `AZURE_OPENAI_ENDPOINT` and managed identity authentication |
| Invalid JSON output | Ensure `temperature: 0.0` and `response_format: json_object` |
| Flow validation fails | Run `pf flow validate -f flow.dag.yaml --verbose` |
| Classification inconsistent | Lower temperature or add more examples to system prompt |
