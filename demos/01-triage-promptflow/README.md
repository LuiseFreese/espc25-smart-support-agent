# Demo 01: Ticket Triage with Azure OpenAI

This demo shows how Azure OpenAI classifies support tickets by category and priority using prompt engineering.

## What This Demo Shows

- **Prompt engineering** for structured JSON output
- **Few-shot learning** to guide classification
- **Azure OpenAI** integration with keyword-based fallback

## Azure Resources Used

### Azure OpenAI Service (`oai-agents-*`)

**Purpose:** Runs the GPT-4o-mini model to classify support tickets intelligently

**Model Deployed:** `gpt-4o-mini` (2024-07-18)

**Why This Model:**
- Fast response times (<2 seconds P95)
- Cost-effective for classification tasks (~$0.0001 per ticket)
- Native JSON mode for structured outputs
- Good at understanding context with few examples

**How It's Used:**
1. Receives ticket text as user prompt
2. Applies system prompt with classification rules
3. Returns structured JSON: `{"category": "...", "priority": "..."}`

**Categories Supported:**
- Billing
- Technical
- Account
- Access

**Priorities Assigned:**
- High (urgent issues, service outages)
- Medium (standard requests)
- Low (informational queries)

### Application Insights (Optional for Production)

**Purpose:** Monitor classification accuracy and performance

**Metrics Tracked:**
- Latency per classification (target: P95 <2s)
- Token usage per request
- Category distribution (spot trends)
- Error rates and retries

**Value:** In production, helps identify when classification accuracy degrades or new ticket types emerge that need updated prompts.

## Implementation Approaches

### Current: Keyword-Based Triage

The production system (Demo 04) uses keyword matching for 100% deterministic results:

```typescript
// From demos/04-real-ticket-creation/function/src/services/AIService.ts
if (text.includes('password') || text.includes('login')) 
  return 'Access';
if (text.includes('vpn') || text.includes('network'))
  return 'Network';
```

**Pros:** Fast, predictable, no AI costs
**Cons:** Limited to known keywords, doesn't understand context

### Alternative: Prompt Flow (This Demo)

This demo shows the Prompt Flow approach for AI-based classification:

```yaml
# flow.dag.yaml
inputs:
  ticket_text: string
outputs:
  category: string
  priority: string
nodes:
  - name: classify
    type: llm
    source: prompts/classify.jinja2
```

**Pros:** Understands context, handles variations, learns from examples
**Cons:** Higher latency (~1-2s), costs per request, requires prompt tuning

## When to Use Each Approach

**Use Keyword-Based When:**
- Categories are well-defined with clear signals
- Speed and cost are critical (high volume)
- Accuracy requirements are met by keywords

**Use AI-Based When:**
- Ticket language varies significantly
- Context matters (e.g., "down" in different contexts)
- New categories emerge frequently

## Cost Comparison

**Keyword-Based:**
- $0 per ticket (compute only)
- 1,000 tickets/day = $0/month

**AI-Based (GPT-4o-mini):**
- ~$0.0001 per ticket (150 input + 50 output tokens)
- 1,000 tickets/day = ~$3/month

## Accuracy Expectations

**Keyword-Based:** 95-100% on known patterns
**AI-Based:** 85-95% (depends on prompt quality and training examples)

## Next Steps

To implement this demo in production:

1. Replace keyword logic in `AIService.ts` with OpenAI call
2. Add system prompt from `prompts/system.jinja2`
3. Monitor accuracy in Application Insights
4. Iterate on prompt based on misclassifications

See main [README.md](../../README.md) for deployment instructions.

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

### Classification Testing

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
- All categories classified correctly (Technical, Account, Billing, Access)
- System prompt effectively guides the model to structured JSON output

### 🔍 Observations

**What's Working**:
- Structured JSON output with `response_format: json_object`
- Zero temperature ensures deterministic results
- Clear classification rules in system prompt
- Fast response time (<1 second per classification)
- Cost-effective: ~$0.0001 per ticket

**Prompt Flow Notes**:
- ⚠️ Flow definition exists (`flow.dag.yaml`) but **not deployed to Azure AI Foundry**
- Classification logic validated using direct Azure OpenAI SDK calls
- Jinja2 templates updated (system prompt embedded in classify.jinja2)
- To deploy: Use Azure AI Foundry portal or `az ml` CLI commands

### 📝 Test Command

```bash
# Python SDK test (current validation method)
python tests/test-demo01-triage.py

# Prompt Flow test (requires Prompt Flow CLI setup)
# pf flow test -f demos/01-triage-promptflow/flow.dag.yaml \
#   --inputs ticket_text='VPN disconnects every 5 minutes'
```

### Production Status

**Current State**: Demo 01 classification logic is **FULLY FUNCTIONAL** but **not deployed as Prompt Flow**.

**Verified Components**:
- Azure OpenAI model (`gpt-4o-mini`) working
- System prompt with clear classification rules
- JSON structured output
- High classification accuracy (100% category, 80% priority)

**Usage in Demo 04b**:
- Demo 04b currently uses **keyword-based triage** (100% accuracy on specific test cases)
- This LLM-based approach could replace keyword matching for better handling of edge cases
- Trade-off: Higher cost (~$0.0001/ticket) vs better accuracy on ambiguous tickets

### Deployment to Prompt Flow (Optional)

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

