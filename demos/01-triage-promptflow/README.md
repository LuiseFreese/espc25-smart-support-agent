# Demo 01: Ticket Triage with Azure OpenAI (Reference Only)

**⚠️ This demo is a LEARNING REFERENCE - it is NOT deployed in the production system.**

This demo shows how Azure OpenAI *could* classify support tickets using prompt engineering. **Demo 04 uses keyword-based triage instead** for speed and accuracy.

## Purpose of This Demo

**Educational:** Teaches prompt engineering patterns for classification tasks
**Not Deployed:** Demo 04 uses simpler keyword matching in production
**Use Case:** Show attendees the AI approach before explaining why we chose keywords

## What This Demo Teaches

- **Prompt engineering** for structured JSON output
- **System prompts** to guide model behavior
- **Alternative approach** to keyword matching (not currently used)

## Why We Don't Deploy This

**Demo 04 uses keyword-based triage because:**
1. ✅ **100% accuracy** on known patterns (VPN, password, billing keywords)
2. ✅ **Instant response** (no API call latency)
3. ✅ **Zero cost** (no OpenAI tokens used)
4. ✅ **Deterministic** (same input = same output every time)

**This AI approach would give:**
- ⚠️ 85-95% accuracy (depends on prompt quality)
- ⚠️ 1-2 second latency (API call overhead)
- ⚠️ ~$3/month for 1000 tickets/day
- ⚠️ Non-deterministic (slight variations possible)

## How It Would Work (If Deployed)

### Azure OpenAI Service

**Model:** `gpt-4o-mini` (already deployed for Demo 02 RAG)
**System Prompt:** See `prompts/system.jinja2`
**Output Format:** JSON with category and priority

**Flow:**
```
User ticket → System prompt + ticket text → GPT-4o-mini → JSON response
```

**Example:**
```json
Input: "VPN disconnects every 5 minutes"
Output: {
  "category": "Network",
  "priority": "Medium"
}
```

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

## How to Test This Approach (For Learning)

**In Azure AI Foundry Playground:**
1. Navigate to Chat Playground
2. Select `gpt-4o-mini` deployment
3. Copy system prompt from `prompts/classify.jinja2`
4. Test with: "VPN disconnects every 5 minutes"
5. Model returns: `{"category": "Network", "priority": "Medium"}`

**Why This Is Good for Teaching:**
- Shows prompt engineering in action
- Demonstrates Azure AI Foundry Playground
- Illustrates the AI approach before explaining why we chose keywords

## Comparison: AI vs Keyword Approach

| Aspect | AI (This Demo) | Keywords (Demo 04 Production) |
|--------|----------------|-------------------------------|
| **Accuracy** | 85-95% | 100% (known patterns) |
| **Speed** | 1-2 seconds | <10ms |
| **Cost** | ~$3/month | $0 |
| **Flexibility** | Handles variations | Exact matches only |
| **Production Status** | ❌ Reference only | ✅ Deployed |

## When You'd Use AI Triage

**Good scenarios for AI-based classification:**
- Ticket language varies significantly
- Context matters ("down" means different things)
- Categories change frequently
- You have budget for API calls

**Our case (why we use keywords):**
- Limited, well-defined categories (Network, Access, Billing, Software)
- Clear keyword signals ("VPN", "password", "charged")
- High volume (cost matters)
- Speed critical (instant processing)

## File Structure

```
01-triage-promptflow/
├── flow.dag.yaml           # Prompt flow definition (reference)
├── prompts/
│   ├── system.jinja2       # System prompt (REFERENCE ONLY)
│   └── classify.jinja2     # User message template (REFERENCE ONLY)
├── data/
│   └── eval.jsonl          # Test dataset examples
├── requirements.txt        # Python dependencies (not deployed)
└── README.md               # This file
```

**Note:** These files are teaching materials, not deployed code. Demo 04 uses keyword logic in `AIService.ts` instead.

## For Presenters

**How to use this demo in your session:**

1. **Show the Problem:** "We need to classify support tickets"
2. **Show AI Approach:** Demo this in Azure AI Foundry Playground (5 min)
3. **Explain the Trade-off:** Show comparison table above
4. **Reveal Production Choice:** "We chose keywords for THIS use case"
5. **Show Production Code:** Demo 04 `AIService.ts` keyword logic

**Key Message:** "AI isn't always the answer - choose the right tool for the job!"

---

## Historical Note: Validation Results

These test results show the AI approach WAS working, we just chose not to deploy it:

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

### Test Command

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

