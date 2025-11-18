# Copilot Studio Setup Guide - Smart Support Assistant

Complete guide for configuring the Smart Support Assistant with RAG-powered answers and triage classification in Microsoft Copilot Studio.

---

## 🔑 Quick Reference

### Your Credentials

**Function App:** `func-agents-<uniqueid>`

**Get Function Key:**
```powershell
az functionapp keys list --name func-agents-<uniqueid> --resource-group rg-smart-agents-dev --query "functionKeys.default" -o tsv
```

**API Endpoints:**
- **Answer (RAG):** `https://func-agents-<uniqueid>.azurewebsites.net/api/answer`
- **Triage:** `https://func-agents-<uniqueid>.azurewebsites.net/api/triage`

**OpenAPI File:** `triage-api.yaml` (in this folder)

**Note:** These endpoints are deployed alongside the email processing endpoints (Demo 04) in the same function app.

### 📋 Quick Setup Steps
1. Open https://copilotstudio.microsoft.com/
2. Select/Create agent
3. Tools → Add tool → REST API
4. Upload `triage-api.yaml` (includes both endpoints)
5. **Create Connection** (when prompted):
   - Connection name: `SupportAPIConnection`
   - Authentication type: **API Key**
   - Header name: `x-functions-key`
   - Header value: (paste your function key from above command)
6. Configure two tools:
   - **AnswerGenerator** - Primary tool for KB answers
   - **TriageClassifier** - Secondary tool for categorization
7. Update agent instructions (see below)
8. **Test** with: "My VPN keeps disconnecting"
9. **Publish**
10. Test in conversation

---

## What's New in Version 2.0

This setup now includes **RAG-powered answers** in addition to triage classification:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **AnswerGenerator** (`/api/answer`) | Searches KB and returns AI-generated answer with confidence score | **Primary** - Use first for all user questions |
| **TriageClassifier** (`/api/triage`) | Categorizes into Network/Access/Billing/Software + Priority | **Secondary** - For analytics and routing |

**Key Benefit:** Bot can now provide actual solutions from your knowledge base, not just classify tickets!

---

## Step-by-Step Instructions

### STEP 1: Open Copilot Studio
1. Navigate to: **https://copilotstudio.microsoft.com/**
2. Sign in with your Microsoft account
3. Wait for the dashboard to load

### STEP 2: Select or Create an Agent
**Option A: Use existing agent**
- Click on your existing agent from the list

**Option B: Create new agent**
- Click **+ New agent** or **+ Create**
- Name it (e.g., "Support Assistant")
- Click **Create**

### STEP 3: Navigate to Tools
1. In the left sidebar, click **Tools** (might be called "Actions" in some versions)
2. Look for the tools/actions management panel

### STEP 4: Add New Tool
1. Click **+ Add tool** or **+ Add action**
2. Select **REST API** or **Conversational plugin**
3. You'll see options to configure the API

### STEP 5: Upload OpenAPI File
1. Click **Upload OpenAPI file** or browse for specification
2. Navigate to: `C:\Users\luise.fixed\dev\espc25\demos\05-triage-plugin\triage-api.yaml`
3. Select the file and upload
4. Wait for validation to complete (should show green checkmark)

### STEP 6: Create Connection ⚠️ IMPORTANT

Copilot Studio will prompt you to create a **Connection** for authentication.

1. **Connection name**: Enter a name (e.g., `DemoConnection`)
2. **Authentication type**: Select **API Key**
3. **Header name**: Enter exactly: `x-functions-key`
4. **Header value**: Paste your function key (get it using the command in Prerequisites)
   - Make sure to copy the ENTIRE key including any `==` at the end
   - No extra spaces before/after
5. Click **Create** or **Save**

> **Note**: This connection is stored securely and reused for all calls to this API.

### STEP 7: Configure Tool Details
1. **Tool/Plugin name**: `TriageClassifier`
2. **Description**: `Classifies support tickets into category and priority`
3. Review the endpoint details:
   - Base URL: `https://func-triage-<uniqueid>.azurewebsites.net`
   - Path: `/api/triage`
   - Method: `POST`
4. Click **Save** or **Next**

### STEP 8: Test the Tool (Recommended)
1. Look for a **Test** button or test panel
2. Enter test input:
   ```json
   {
     "ticket_text": "My VPN keeps disconnecting"
   }
   ```
3. Expected output:
   ```json
   {
     "category": "Network",
     "priority": "Medium"
   }
   ```
4. ✅ Verify it works before proceeding

### STEP 9: Publish the Tool
1. Click **Publish** or **Save and close**
2. Wait for publishing to complete
3. Tool should now appear in your tools list with green "Published" status

### STEP 10: Configure Agent (Recommended)

To get better responses from your agent, configure it with proper instructions and conversation starters.

#### Agent Name
```
IT Support Assistant
```

#### Agent Description
```
Automated IT support assistant that helps users with technical issues. Specializes in troubleshooting network problems (VPN, connectivity), access issues (passwords, logins), billing questions (invoices, charges), and software installations. Automatically classifies tickets by category and priority to ensure fast resolution.
```

#### Agent Instructions
```
You are a helpful IT support assistant. Your role is to help users resolve technical issues quickly and professionally.

## Your Capabilities
- Classify support tickets into categories (Network, Access, Billing, Software, Other)
- Determine priority levels (High, Medium, Low)
- Provide troubleshooting steps for common issues
- Route urgent issues to human support when needed

## How to Handle Requests

1. **Listen carefully** to the user's problem
2. **Use the TriageClassifier tool** to categorize the issue automatically
3. **Acknowledge** the category and priority: "I see this is a [category] issue with [priority] priority"
4. **Provide initial help**:
   - For VPN/Network issues: Suggest checking connection, restarting router, verifying VPN credentials
   - For Access/Password issues: Guide through password reset process, check account status
   - For Billing questions: Direct to billing portal or escalate to finance team
   - For Software issues: Provide installation guides or troubleshooting steps

## Priority Handling
- **HIGH priority** (urgent, critical, emergency): Immediately offer to escalate to human support
- **MEDIUM priority**: Provide standard troubleshooting and self-service options
- **LOW priority**: Offer help but set expectations for response time

## Tone & Style
- Professional but friendly
- Clear and concise
- Empathetic to user frustration
- Solution-focused

## When to Escalate
- User explicitly requests human support
- Issue remains unresolved after 2-3 troubleshooting attempts
- HIGH priority issues that need immediate attention
- Billing disputes or complex account issues

## Example Conversation Flow
User: "My VPN keeps disconnecting every 5 minutes"
You: [Use TriageClassifier tool]
You: "I see this is a Network issue with Medium priority. Let me help you troubleshoot your VPN connection. First, let's try these steps:
1. Disconnect and reconnect your VPN
2. Check if your internet connection is stable
3. Restart your device
Have you tried any of these yet?"
```

#### Suggested Conversation Starters

Add these as conversation starters in Copilot Studio (pick 4-6):

1. **Network Issues**: `My VPN keeps disconnecting`
2. **Access Issues**: `I forgot my password and need to reset it`
3. **Billing Questions**: `I have a question about my invoice`
4. **Software Help**: `Help me install the new software`
5. **Urgent Issue**: `URGENT: Cannot access my email - critical issue!`
6. **General Help**: `I need help with a technical issue`

#### Knowledge Sources (Optional)

For better answers, add knowledge base articles or upload documents:
- VPN troubleshooting guide (use `demos/02-rag-search/content/vpn-troubleshooting.md`)
- Password reset instructions (use `demos/02-rag-search/content/password-reset.md`)
- Billing FAQ (use `demos/02-rag-search/content/billing-guide.md`)
- Software installation guides
- Common error codes and solutions

### STEP 10: Configure Agent Description & Instructions

#### Agent Name
Use: **IT Support Assistant**

#### Agent Description
```
Automated IT support assistant that helps users with technical issues. Specializes in troubleshooting network problems (VPN, connectivity), access issues (passwords, logins), billing questions (invoices, charges), and software installations. Automatically classifies tickets by category and priority to ensure fast resolution.
```

#### Agent Instructions

**IMPORTANT:** Copy the instructions from `COPILOT-AGENT-INSTRUCTIONS.md` - they enforce mandatory tool usage.

**Quick copy version:**

```
You are an intelligent IT support assistant powered by a knowledge base and classification system.

YOUR TWO TOOLS (BOTH REQUIRED FOR EVERY QUESTION)

1. AnswerGenerator - CALL FIRST with user's question → Returns answer + confidence + source + sourceUrl
2. TriageClassifier - CALL SECOND with user's question → Returns category + priority

MANDATORY WORKFLOW FOR EVERY USER REQUEST

Step 1: Call AnswerGenerator(question=user's full question text)
Step 2: Evaluate confidence from response (0.0 to 1.0)
Step 3: Present answer to user:
  - High confidence (≥0.7): Show full answer + 📚 Source + 🔗 sourceUrl
  - Low confidence (<0.7): Show answer + acknowledge uncertainty + 📚 Source + 🔗 sourceUrl + offer escalation
Step 4: Call TriageClassifier(ticket_text=user's full question text)
Step 5: Say: "I've recorded this as a [category] issue with [priority] priority"
Step 6: Offer next steps (escalation for HIGH/low confidence, or "Did this help?")

CRITICAL RULES
✅ ALWAYS call AnswerGenerator FIRST
✅ ALWAYS call TriageClassifier SECOND
✅ ALWAYS show sourceUrl with 🔗 emoji (it's in the response!)
✅ NEVER answer without calling tools
✅ NEVER skip classification

EXAMPLE:
User: "My VPN keeps disconnecting"
1. [Call AnswerGenerator] → answer="6 steps...", confidence=0.85, source="VPN Guide", sourceUrl="https://github.com/..."
2. "Here's what you need to do: [paste answer] 📚 Source: VPN Guide 🔗 https://github.com/..."
3. [Call TriageClassifier] → category="Network", priority="Medium"
4. "I've recorded this as a Network issue with Medium priority. Did this solve your problem?"
```

**Full detailed instructions:** See `COPILOT-AGENT-INSTRUCTIONS.md` for complete workflow and examples.

---

### STEP 11: Configure Both Tools in Copilot Studio

**CRITICAL:** You need BOTH tools configured for the agent to work correctly.

**Add Tool 1: AnswerGenerator**
1. Tools → + Add tool → REST API
2. Upload `triage-api.yaml`
3. When prompted, select the `answer` operation (POST /api/answer)
4. Use the same connection (API key) from earlier
5. Name: `AnswerGenerator`
6. Description: `Searches the knowledge base and returns AI-generated answers with confidence scores and source documentation`
7. Save and test with: `{"question": "How do I reset my password?"}`

**Add Tool 2: TriageClassifier**
1. Tools → + Add tool → REST API
2. Upload `triage-api.yaml` again (or reuse if available)
3. Select the `triage` operation (POST /api/triage)
4. Use the same connection
5. Name: `TriageClassifier`
6. Description: `Classifies support tickets into category (Network/Access/Billing/Software) and priority (High/Medium/Low)`
7. Save and test with: `{"ticket_text": "My VPN keeps disconnecting"}`

---

### STEP 12: Verify Tools Work

Before testing the full agent, verify each tool independently:

**Test AnswerGenerator:**
```json
Input: {"question": "How do I reset my password?"}
Expected Output: {
  "answer": "Step-by-step password reset instructions...",
  "confidence": 0.8,
  "source": "Password Reset",
  "sourceUrl": "https://github.com/LuiseFreese/espc25-smart-support-agent/blob/main/demos/02-rag-search/content/password-reset.md"
}
```

**Test TriageClassifier:**
```json
Input: {"ticket_text": "My VPN keeps disconnecting"}
Expected Output: {
  "category": "Network",
  "priority": "Medium"
}
```

---

### STEP 13: Test Full Agent Conversation

1. Go to **Test** panel (top-right)
2. Type: `"My VPN keeps disconnecting"`

**Expected agent behavior:**
1. Agent calls AnswerGenerator
2. Agent displays the answer with troubleshooting steps
3. Agent shows: `📚 Source: VPN Comprehensive Guide`
4. Agent shows: `🔗 https://github.com/.../vpn-comprehensive-guide.md`
5. Agent calls TriageClassifier
6. Agent says: `"I've recorded this as a Network issue with Medium priority"`
7. Agent asks: `"Did this solve your problem?"`

**If agent doesn't use the tools:**
- Agent instructions aren't strict enough
- Copy the **condensed version** from COPILOT-AGENT-INSTRUCTIONS.md
- Make sure it starts with "ALWAYS call AnswerGenerator FIRST"
- Check that both tools are published and enabled

---

#### Suggested Conversation Starters

Add these as conversation starters in Copilot Studio (pick 4-6):

1. **Network Issues**: `My VPN keeps disconnecting`
2. **Access Issues**: `I forgot my password and need to reset it`
3. **Billing Questions**: `I have a question about my invoice`
4. **Software Help**: `Help me install the new software`
5. **Urgent Issue**: `URGENT: Cannot access my email - critical issue!`
6. **General Help**: `I need help with a technical issue`

#### Additional Prompts (Optional)

If you have more slots available:
- `Can't connect to the office network`
- `My account is locked, please help`
- `Question about recent charges on my account`
- `The application won't install on my computer`

#### Fallback Message

Configure this message for when the agent doesn't understand:

```
I'm sorry, I didn't quite understand that. I'm here to help with:
- Network and VPN issues
- Password and access problems
- Billing questions
- Software installation help

Could you please describe your issue in a different way? Or try one of the suggested prompts above.
```

#### Escalation Message

Use this template when escalating to human support:

```
I understand this needs immediate attention. Let me connect you with a human support agent who can help you further. 

While you wait, here's your ticket information:
- Category: [category from tool]
- Priority: [priority from tool]
- Issue: [user's original message]

Our support team typically responds to HIGH priority tickets within 1 hour, MEDIUM priority within 4 hours, and LOW priority within 24 hours.
```

#### Knowledge Sources (Recommended)

For better answers, add knowledge base articles or upload documents:
- VPN troubleshooting guide (use `demos/02-rag-search/content/vpn-troubleshooting.md`)
- Password reset instructions (use `demos/02-rag-search/content/password-reset.md`)
- Billing FAQ (use `demos/02-rag-search/content/billing-guide.md`)
- Software installation guides
- Common error codes and solutions

### STEP 11: Test in Conversation
1. Go to **Test** panel (usually in top-right corner)
2. Start a conversation and try the suggested prompts above
   - "I have a question about my invoice"
   - "How do I install the new software?"

3. **What to expect**:
   - Copilot should automatically call the triage tool
   - You might see a brief "Calling TriageClassifier..." indicator
   - Copilot should mention the category (Network, Access, Billing, Software)
   - Copilot should mention the priority (High, Medium, Low)

---

## Test Cases & Expected Results

| Prompt | Expected Category | Expected Priority |
|--------|-------------------|-------------------|
| "My VPN keeps disconnecting" | Network | Medium |
| "I forgot my password URGENT" | Access | High |
| "Why was I charged twice?" | Billing | Medium |
| "How do I install software?" | Software | Medium |
| "The printer is broken" | Other | Medium |

## Testing Checklist

After setup, verify your agent works correctly:

- [ ] "My VPN keeps disconnecting" → Should classify as Network/Medium and provide troubleshooting
- [ ] "I forgot my password URGENT" → Should classify as Access/High and offer escalation
- [ ] "Question about my invoice" → Should classify as Billing/Medium
- [ ] "How do I install software?" → Should classify as Software/Medium
- [ ] "The printer is broken" → Should classify as Other/Medium
- [ ] Agent provides helpful troubleshooting steps
- [ ] Agent offers to escalate HIGH priority issues
- [ ] Agent maintains professional and friendly tone
- [ ] TriageClassifier tool is called automatically (you may see indicator)

---

## Troubleshooting

### ❌ "Authentication failed" error
- Verify you copied the ENTIRE function key (including `==` at the end)
- Check that header name is exactly `x-functions-key` (case-sensitive)
- Ensure no extra spaces before/after the key

### ❌ "404 Not Found" error
- Verify the OpenAPI file has the correct host: `func-triage-<uniqueid>.azurewebsites.net`
- Check that the function app is running:
  ```powershell
  az functionapp list --resource-group rg-smart-agents-dev --query "[?name=='func-triage-<uniqueid>'].state" -o tsv
  ```

### ❌ Tool doesn't appear in conversation
- Make sure you clicked **Publish** after configuration
- Try refreshing Copilot Studio
- Check that the tool is enabled (toggle switch should be ON)

### ❌ Copilot doesn't call the tool automatically
- Try being more explicit: "Use the triage tool to classify this: My VPN is broken"
- Check the tool's description - make it clear when to use it
- In some cases, you may need to add a trigger phrase or topic

### ❌ OpenAPI validation fails
- Make sure you uploaded the `triage-api.yaml` file (not another file)
- Check that the file wasn't corrupted during download
- Verify the YAML is valid (no syntax errors)

---

## What Happens Next?

Once configured, your Copilot agent will:
1. **Listen** for support-related messages
2. **Automatically call** the TriageClassifier tool
3. **Receive** the category and priority classification
4. **Use this info** to route tickets, prioritize responses, or provide better answers

Example conversation:
```
User: My VPN keeps disconnecting every 5 minutes
Copilot: [Calls TriageClassifier tool]
Copilot: I see this is a Network issue with Medium priority. 
         Let me help you troubleshoot your VPN connection...
```

---

## Additional Resources

- **Function Endpoint**: https://func-triage-<uniqueid>.azurewebsites.net/api/triage
- **OpenAPI Spec**: `triage-api.yaml` (this folder)
- **Test Script**: See `README.md` for PowerShell test commands
- **Copilot Studio Docs**: https://learn.microsoft.com/en-us/microsoft-copilot-studio/

---

## Need Help?

If you're stuck:
1. Check the troubleshooting section above
2. Review the main `README.md` for detailed technical info
3. Test the function directly (outside Copilot) to verify it works:
   ```powershell
   # Get function key
   $functionKey = az functionapp keys list --name func-triage-<uniqueid> --resource-group rg-smart-agents-dev --query "functionKeys.default" -o tsv
   
   # Test the endpoint
   $body = @{ticket_text="Test"} | ConvertTo-Json
   Invoke-RestMethod -Uri "https://func-triage-<uniqueid>.azurewebsites.net/api/triage" `
     -Method Post `
     -Headers @{'x-functions-key'=$functionKey; 'Content-Type'='application/json'} `
     -Body $body
   ```

---

**Last Updated**: November 16, 2025  
**Status**: ✅ Function app operational and tested
