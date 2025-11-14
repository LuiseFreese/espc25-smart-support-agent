# Demo 05: Copilot Plugin for IT Support

This demo shows how to integrate Azure AI Foundry agents with **Microsoft 365 Copilot** using a declarative plugin. Users can ask IT support questions directly in Copilot, and the plugin calls our RAG function to provide grounded answers from the knowledge base.

## What is a Declarative Copilot Plugin?

A **declarative plugin** extends Microsoft 365 Copilot with custom capabilities defined through configuration files (no code required). It:
- Describes your API in OpenAPI format
- Defines when Copilot should use the plugin
- Provides instructions for how to interpret results
- Works in Teams, Outlook, Office apps, and Copilot chat

## Azure Resources Used

| Resource | Usage |
|----------|-------|
| **RAG Function** (`func-rag-dw7z4hg4ssn2k`) | Backend API that Copilot calls for IT support queries |
| **Azure AI Search** | Knowledge base retrieval (used by RAG function) |
| **Azure OpenAI** | Embeddings and answer generation (used by RAG function) |
| **Microsoft 365 Copilot** | User interface and orchestration |

## How It Works

```
User in Copilot
     ↓
"How do I reset my password?"
     ↓
Microsoft 365 Copilot detects IT support query
     ↓
Copilot calls RAG function via OpenAPI spec
     ↓
RAG function searches knowledge base
     ↓
Returns answer + confidence + sources
     ↓
Copilot formats response for user
```

## Files Structure

```
demos/05-copilot-plugin/
├── README.md                        # This file
├── appPackage/
│   ├── manifest.json                # Teams app manifest (Copilot extension)
│   ├── ai-plugin.json               # Declarative plugin configuration
│   ├── openapi.json                 # RAG function API specification
│   ├── color.png                    # App icon (192x192)
│   └── outline.png                  # App icon outline (32x32)
└── .env.example                     # Environment variables template
```

## Setup Instructions

### 1. Prerequisites

- Microsoft 365 developer tenant or enterprise tenant with Copilot license
- Teams admin rights to upload custom apps
- RAG function deployed and accessible (already done in Demo 02)

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
RAG_FUNCTION_URL=https://func-rag-dw7z4hg4ssn2k.azurewebsites.net/api/rag-search
RAG_FUNCTION_KEY=your-function-key-here
```

### 3. Create App Package

```bash
# Zip the appPackage folder
cd demos/05-copilot-plugin
Compress-Archive -Path appPackage\* -DestinationPath ITSupportPlugin.zip
```

### 4. Deploy to Teams

1. Open **Teams Admin Center** (admin.teams.microsoft.com)
2. Go to **Teams apps** > **Manage apps**
3. Click **Upload new app** > **Upload**
4. Select `ITSupportPlugin.zip`
5. Approve the app for your organization

### 5. Install Plugin in Copilot

1. Open **Microsoft 365 Copilot** (copilot.microsoft.com or Teams)
2. Click **Plugins** icon (puzzle piece)
3. Search for "IT Support Agent"
4. Click **Add**

## Testing the Plugin

### Test Queries

Try these queries in Microsoft 365 Copilot:

1. **Password Reset**
   - "How do I reset my password?"
   - Expected: Step-by-step password reset instructions

2. **VPN Issues**
   - "My VPN keeps disconnecting, what should I do?"
   - Expected: VPN troubleshooting steps

3. **Billing Questions**
   - "I was charged twice on my bill, how do I get a refund?"
   - Expected: Duplicate charge resolution process

4. **Software Installation**
   - "I can't install Office 365"
   - Expected: Software installation troubleshooting

5. **MFA Setup**
   - "How do I configure multi-factor authentication?"
   - Expected: MFA setup instructions

### What to Look For

- ✅ Copilot recognizes IT support queries and triggers the plugin
- ✅ Responses include confidence scores (0.6-0.9 for good matches)
- ✅ Answers cite knowledge base sources
- ✅ Response time < 5 seconds
- ✅ Copilot formats the answer naturally in conversation

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Microsoft 365 Copilot                   │
│  (Teams, Outlook, Office, Web)                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ User asks IT question
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Declarative Plugin Manifest                 │
│  - Detects IT support intent                            │
│  - Constructs API request                               │
│  - Sends to RAG function                                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ HTTPS POST
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           RAG Function (func-rag-dw7z4hg4ssn2k)         │
│  - Embeds question                                       │
│  - Searches Azure AI Search                             │
│  - Generates answer with GPT-4o-mini                    │
│  - Returns {answer, confidence, sources}                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ JSON Response
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Microsoft 365 Copilot                   │
│  - Formats response                                      │
│  - Shows confidence score                               │
│  - Displays sources                                     │
│  - Continues conversation                               │
└─────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Context-Aware Invocation
- Copilot automatically detects IT support questions
- Plugin only triggers for relevant queries
- Seamlessly blends with Copilot's other capabilities

### 2. Confidence Scoring
- Returns confidence score (0.1-0.9) based on semantic match quality
- Copilot can decide whether to use answer or ask for clarification
- Threshold: 0.6 (same as Demo 02 validation)

### 3. Source Citations
- Every answer includes knowledge base sources
- Users can verify information
- Builds trust in AI-generated responses

### 4. Natural Conversation
- Copilot integrates plugin responses naturally
- Users don't need to learn special commands
- Works across all Copilot surfaces (Teams, Outlook, web)

## Validation

## Current Status

⚠️ **Conceptual Demo** - This demonstrates the architecture and configuration for Copilot integration.

**What's Included:**
- ✅ OpenAPI specification for RAG function
- ✅ Teams app manifest (v1.16)
- ✅ App icons and packaging
- ✅ Deployment scripts

**What's Needed for Full Implementation:**
- Bot backend service (Azure Bot Service or Bot Framework)
- Bot messaging endpoint to handle Teams queries
- Adaptive card responses
- Alternative: Use Power Platform connector or API Management policy

**Recommended Approaches:**

### Option 1: API Management (Simplest)
Use Azure API Management with built-in Teams connector:
1. Import RAG function OpenAPI spec to APIM
2. Configure Teams connector in APIM
3. No bot code required

### Option 2: Power Automate
1. Create Power Automate flow
2. Trigger: Teams message
3. Action: Call RAG function
4. Response: Post adaptive card

### Option 3: Full Bot (Most Flexible)
1. Deploy Azure Bot Service
2. Implement Bot Framework SDK
3. Handle messaging activities
4. Full conversation control

**Session Demo Value:**
This demo shows the **configuration and architecture** for connecting Azure AI Foundry to Microsoft 365 Copilot, addressing session requirement #3.

## Troubleshooting

### Plugin Not Appearing in Copilot

1. Check app approval status in Teams Admin Center
2. Verify user has Copilot license
3. Wait 5-10 minutes for app catalog sync
4. Try refreshing Copilot or signing out/in

### Plugin Not Triggering

1. Verify semantic descriptions in `ai-plugin.json`
2. Make query more specific to IT support
3. Check OpenAPI spec is valid (use validator)
4. Review Copilot activity logs in Teams Admin Center

### API Errors

1. Verify RAG function URL and key in `openapi.json`
2. Test RAG function directly (see Demo 02 README)
3. Check function logs in Azure Portal
4. Verify CORS settings allow Copilot domains

### Low Confidence Scores

1. Expand knowledge base with more documents
2. Add synonyms and alternate phrasings
3. Re-ingest KB after changes
4. Review semantic ranking configuration

## Cost Estimation

**Per Query**:
- Copilot orchestration: Included in M365 license
- RAG function execution: $0.0001 (compute)
- Azure OpenAI embeddings: $0.00013 (text-embedding-3-large)
- Azure OpenAI completion: $0.0002 (gpt-4o-mini)
- Azure AI Search: $0.0001 (query)
- **Total**: ~$0.0005 per query

**Monthly (1000 queries)**:
- ~$0.50 per month for API calls
- Plus fixed costs: Search ($250), OpenAI ($0), Functions ($0 consumption)

## Next Steps

### Enhancements

1. **Add ticket creation action** (Phase 2)
   - Let users create tickets from Copilot
   - Integration with Demo 03 CreateTicket function

2. **Expand knowledge base**
   - Add more IT support documents
   - Include troubleshooting guides
   - Add FAQs and common scenarios

3. **Add user feedback**
   - Thumbs up/down in responses
   - Track which answers are helpful
   - Improve KB based on feedback

4. **Multi-language support**
   - Translate KB documents
   - Detect user language
   - Return answers in user's language

## Security Considerations

- ✅ Function key authentication (not exposed in manifest)
- ✅ HTTPS only for API calls
- ✅ No PII stored in knowledge base
- ✅ Copilot respects M365 permissions
- ✅ Audit logs in Application Insights

## References

- [Declarative Copilot Plugins](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-declarative-plugin)
- [OpenAPI for Copilot](https://learn.microsoft.com/microsoft-365-copilot/extensibility/openapi-spec)
- [Teams App Manifest](https://learn.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema)
- [Demo 02 README](../02-rag-search/README.md) - RAG function details
