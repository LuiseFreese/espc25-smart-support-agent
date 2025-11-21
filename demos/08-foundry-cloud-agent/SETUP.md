# Demo 08 Setup Guide

## ✅ Step 1: Install Azure AI Foundry Extension (COMPLETED)

You should already have this installed. If not:
1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "Azure AI Foundry"
3. Install `ms-azuretools.vscode-azureaifoundry`

## ✅ Step 2: Files Updated with Your Azure Resources

All files have been configured with:
- **Function Apps**: `func-agents-7egpzzovabxku` and `func-rag-7egpzzovabxku`
- **Model Deployment**: `gpt-5.1-chat`

Files updated:
- ✅ `agent/cloud-support-agent.yaml`
- ✅ `agent/tools/triage-api.yaml`
- ✅ `agent/tools/ticket-api.yaml`
- ✅ `agent/tools/rag-openapi.yaml`

## 📋 Step 3: Create File Search Vector Store

1. **Open Azure AI Foundry Portal**
   ```
   https://ai.azure.com
   ```

2. **Navigate to Your Project**
   - Select your AI Hub (likely `aihub-agents-7egpzzovabxku`)
   - Select your AI Project (likely `aiproject-agents`)

3. **Create Vector Store**
   - Left menu → **Vector Stores**
   - Click **+ New Vector Store**
   - Name: `support-agent-files`
   - Click **Create**

4. **Upload Documents**
   Upload these files from `demos/08-foundry-cloud-agent/agent/tools/`:
   - ✅ `refund-policy.md`
   - ✅ `vpn-faq.md`
   
   Click **Upload** → Select both files → **Upload**

5. **Wait for Indexing**
   - Status should change to "Ready" (takes 1-2 minutes)

## 🔧 Step 4: Import Agent in VS Code

1. **Open Agent YAML**
   ```
   Open: demos/08-foundry-cloud-agent/agent/cloud-support-agent.yaml
   ```

2. **Import Agent**
   - Press `Ctrl+Shift+P`
   - Type: `Azure AI Foundry: Import Agent`
   - Select your AI Project
   - Confirm import

3. **Verify Import**
   - Extension should show "Agent imported successfully"
   - Check Foundry portal → Agents → `cloud-support-agent` should appear

## 🧪 Step 5: Test in Playground

### Option A: VS Code Extension
1. `Ctrl+Shift+P` → `Azure AI Foundry: Open Playground`
2. Select `cloud-support-agent`
3. Try test prompts (see below)

### Option B: Foundry Portal
1. Go to https://ai.azure.com
2. Your Project → **Agents** → `cloud-support-agent`
3. Click **Test in Playground**

## 🎯 Test Prompts

### Test 1: VPN Issue (should use enterpriseSearch)
```
My VPN keeps disconnecting every 5 minutes. How do I fix it?
```

**Expected:**
- Agent calls `triage` → Category: Network
- Agent calls `enterpriseSearch` (Azure AI Search)
- Agent returns troubleshooting steps

### Test 2: Refund Policy (should use fileSearch)
```
What is your refund policy?
```

**Expected:**
- Agent calls `fileSearch` (vector store)
- Agent returns policy from refund-policy.md

### Test 3: Ticket Creation
```
Please create a ticket for my VPN issue. My email is user@contoso.com.
```

**Expected:**
- Agent calls `triage`
- Agent calls `ticket`
- Agent returns ticket ID like TKT-20251120-XXXXXX

### Test 4: Multi-Tool Flow
```
I can't access the portal and need urgent help. Email: user@contoso.com
```

**Expected:**
- Agent calls `triage` → Category: Access, Priority: High
- Agent calls `enterpriseSearch` → Looks for access docs
- Agent calls `ticket` → Creates escalation

## 🔍 Verify Tool Traces

After each query, click **Show trace** in Playground to see:
- ✅ Tool invocations
- ✅ Tool responses
- ✅ Agent reasoning

## ⚠️ Troubleshooting

### Agent doesn't call tools
**Fix:**
```powershell
# Verify function apps are running
az functionapp show -n func-agents-7egpzzovabxku -g rg-smart-agents-dev --query "state"
az functionapp show -n func-rag-7egpzzovabxku -g rg-smart-agents-dev --query "state"
```
Both should return: `"Running"`

### File Search returns empty
**Fix:**
- Go to Foundry portal → Vector Stores
- Verify `support-agent-files` exists
- Check that 2 documents are uploaded and indexed
- Status should be "Ready"

### OpenAPI authentication fails
**Fix:**
Get function keys and add to Foundry:
```powershell
# Get triage/ticket function key
az functionapp keys list -n func-agents-7egpzzovabxku -g rg-smart-agents-dev --query "functionKeys" -o json

# Get RAG function key
az functionapp keys list -n func-rag-7egpzzovabxku -g rg-smart-agents-dev --query "functionKeys" -o json
```
Then add keys in Foundry portal → Agent settings → API keys

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Agent appears in Foundry portal
- ✅ All 4 tools show in agent configuration
- ✅ Test queries invoke correct tools
- ✅ Traces show tool calls and responses
- ✅ Agent returns accurate answers without hallucinating

## 📚 Next Steps

1. **Add more documents** to File Search (billing policies, FAQs)
2. **Refine agent instructions** for better routing
3. **Monitor traces** in Application Insights
4. **Deploy to production** using Foundry deployment features

## 🆘 Need Help?

Check:
- `README.md` — Full demo documentation
- `agent/tools/file-search-notes.md` — File Search guide
- [Azure AI Foundry Docs](https://learn.microsoft.com/azure/ai-studio/)
