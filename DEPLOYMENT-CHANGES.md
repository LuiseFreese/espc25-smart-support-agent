# Deployment Architecture Changes - Demo 05 Integration

## Summary

Demo 05 (Copilot Studio plugin endpoints) is now deployed as part of the main Agents function app (`func-agents`) instead of requiring a separate function app.

## Changes Made

### 1. Function Code Integration
**Location:** `demos/04-real-ticket-creation/function/src/`

**Added Files:**
- `src/functions/answer.ts` - RAG-powered KB search endpoint
- `src/functions/triage.ts` - Ticket classification endpoint

**Modified Files:**
- `src/index.ts` - Added registration for triage and answer endpoints

**Result:** func-agents now hosts 7 endpoints:
- GraphWebhook (Demo 04)
- ProcessSupportEmail (Demo 04)
- ManageSubscription (Demo 04)
- PingStorage (Demo 04)
- **triage (Demo 05)** ← NEW
- **answer (Demo 05)** ← NEW

### 2. Deployment Script Updates
**File:** `scripts/deploy.ps1`

**Changes:**
- Section [5b] updated with note that it deploys both Demo 04 AND Demo 05
- No separate deployment step needed for Demo 05
- Single `func azure functionapp publish` deploys all endpoints

**Before:**
```powershell
# [5b] Deploying Agents function (Demo 04)...
```

**After:**
```powershell
# [5b] Deploying Agents function (Demo 04 + Demo 05)...
#      Includes: Email processing endpoints AND Copilot Studio triage/answer endpoints
```

### 3. OpenAPI Specification
**File:** `demos/05-triage-plugin/triage-api.yaml`

**Changes:**
- `host` changed from `func-triage-dw7z4hg4ssn2k` → `func-agents-dw7z4hg4ssn2k`
- `version` bumped to `3.0.1`

**Impact:** Copilot Studio connections now point to the correct func-agents endpoint

### 4. Documentation Updates

**Updated Files:**
- `demos/05-triage-plugin/COPILOT-STUDIO-SETUP.md` - Function app name changed to func-agents
- `demos/05-triage-plugin/README.md` - Added deployment architecture section
- `.github/copilot-instructions.md` - Updated Demo 05 description

**Key Message:** Demo 05 endpoints are part of func-agents, not a separate deployment

## Architecture Benefits

### Before (Planned)
```
func-agents-xxx        → Demo 04 endpoints (email processing)
func-triage-xxx        → Demo 05 endpoints (Copilot plugin)
func-rag-xxx           → Demo 02 endpoint (RAG search)
```

### After (Implemented)
```
func-agents-xxx        → Demo 04 + Demo 05 endpoints (all TypeScript functions)
func-rag-xxx           → Demo 02 endpoint (RAG search)
```

**Benefits:**
1. ✅ Fewer Azure resources (cost savings)
2. ✅ Simpler deployment (one TypeScript build/deploy)
3. ✅ Shared authentication (single function key)
4. ✅ Easier maintenance (centralized codebase)
5. ✅ No infrastructure changes needed (uses existing func-agents)

## How to Use

### Deploy Everything
```powershell
.\scripts\deploy.ps1 -SubscriptionId "<your-sub-id>" -SupportEmail "support@domain.com"
```

### Get Function Key for Copilot Studio
```powershell
az functionapp keys list --name func-agents-<uniqueid> --resource-group rg-smart-agents-dev --query "functionKeys.default" -o tsv
```

### Test Endpoints
```powershell
# Triage endpoint
curl -X POST https://func-agents-<uniqueid>.azurewebsites.net/api/triage `
  -H "x-functions-key: <key>" `
  -H "Content-Type: application/json" `
  -d '{"ticketText": "My VPN keeps disconnecting"}'

# Answer endpoint (RAG search)
curl -X POST https://func-agents-<uniqueid>.azurewebsites.net/api/answer `
  -H "x-functions-key: <key>" `
  -H "Content-Type: application/json" `
  -d '{"question": "How do I reset my password?"}'
```

## Copilot Studio Configuration

1. **Upload OpenAPI spec:** `demos/05-triage-plugin/triage-api.yaml` (v3.0.1)
2. **Create connection:**
   - Connection name: `SupportAPIConnection`
   - Auth type: API Key
   - Header: `x-functions-key`
   - Value: (from `az functionapp keys list` above)
3. **Configure tools:**
   - AnswerGenerator (`searchKnowledgeBase` operation)
   - TriageClassifier (`triageTicket` operation)
4. **Paste agent instructions:** From `COPILOT-AGENT-INSTRUCTIONS.md`

## Migration Path (If Needed)

If you previously deployed Demo 05 separately:

1. **Delete old function app:**
   ```powershell
   az functionapp delete --name func-triage-<uniqueid> --resource-group rg-smart-agents-dev
   ```

2. **Redeploy with updated script:**
   ```powershell
   .\scripts\deploy.ps1 -SubscriptionId "<sub-id>" -SupportEmail "support@domain.com"
   ```

3. **Update Copilot Studio:**
   - Upload new OpenAPI spec (v3.0.1 with func-agents host)
   - Update connection with func-agents API key

## Verification

After deployment, verify all endpoints are registered:

```powershell
az functionapp function list --name func-agents-<uniqueid> --resource-group rg-smart-agents-dev --query "[].name" -o table
```

**Expected Output:**
```
Result
---------------------
GraphWebhook
ManageSubscription
PingStorage
ProcessSupportEmail
answer               ← Demo 05
triage               ← Demo 05
```

## Questions?

See comprehensive documentation in:
- `.github/copilot-instructions.md` - Complete project context
- `demos/05-triage-plugin/COPILOT-STUDIO-SETUP.md` - Copilot configuration
- `demos/05-triage-plugin/README.md` - Demo 05 overview
