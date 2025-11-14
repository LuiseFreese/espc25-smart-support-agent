# Testing Guide

## Overview

This guide covers all testing procedures for the Smart Support Agent system, including end-to-end tests, component tests, and troubleshooting steps.

## Test Scripts

### 1. E2E Test (`tests/e2e-test.ps1`)

**Purpose**: Validate the complete email-to-ticket flow with multiple scenarios

**Test Coverage**:
- ✅ Email data processing
- ✅ Keyword-based triage classification
- ✅ RAG search integration
- ✅ Table Storage ticket persistence
- ✅ AI response generation

**Usage**:
```powershell
.\tests\e2e-test.ps1
```

**Test Scenarios**:

| Scenario | Input | Expected Category | Expected Priority | Validates |
|----------|-------|-------------------|-------------------|-----------|
| VPN Issue | "VPN disconnects every few minutes" | Network | Medium | Network keyword detection |
| Password Reset | "I forgot my password" | Access | Medium | Access keyword detection |
| Billing Question | "I was charged twice" | Billing | Medium | Billing keyword detection |

**Expected Output**:
```
============================================================
  SMART SUPPORT AGENT - END-TO-END TEST
============================================================

------------------------------------------------------------
Test: VPN Issue
Subject: VPN keeps disconnecting

RESULT: SUCCESS
  Ticket ID:  TKT-20251112-867ZOU
  Category:   Network [OK]
  Priority:   Medium [OK]
  Status:     New
  Confidence: 0.3

  AI Response: We have received your support request...

------------------------------------------------------------
Test: Password Reset
Subject: Password reset request

RESULT: SUCCESS
  Ticket ID:  TKT-20251112-POW0BY
  Category:   Access [OK]
  Priority:   Medium [OK]
  ...

------------------------------------------------------------
Test: Billing Question
Subject: Billing question

RESULT: SUCCESS
  Ticket ID:  TKT-20251112-0B4T95
  Category:   Billing [OK]
  Priority:   Medium [OK]
  ...

============================================================
  TEST SUMMARY
============================================================

Total Tests:  3
Passed:       3
Failed:       0

Created Tickets:
  TKT-20251112-867ZOU - VPN Issue [Network/Medium] [100% accurate]
  TKT-20251112-POW0BY - Password Reset [Access/Medium] [100% accurate]
  TKT-20251112-0B4T95 - Billing Question [Billing/Medium] [100% accurate]

============================================================
E2E Test Complete!
Check Azure Table Storage for full ticket details.
============================================================
```

### 2. Quick Test (`tests/quick-test.ps1`)

**Purpose**: Fast validation with a single test case

**Usage**:
```powershell
.\tests\quick-test.ps1
```

**Test Case**: VPN connectivity issue

**Expected Output**:
```
Testing ProcessSupportEmail Function

Calling function...

SUCCESS!
Ticket ID: TKT-20251112-NAUMGJ
Category: Network
Priority: Medium
Status: New
Confidence: 0.3

AI Response:
We have received your support request and will respond shortly.

Test complete!
```

### 3. RAG Function Test (`tests/test-rag.ps1`)

**Purpose**: Direct testing of the RAG search function

**Status**: ⚠️ Requires authentication fix

**Usage**:
```powershell
.\tests\test-rag.ps1
```

**Current Issue**: RAG function returns 400/401 errors - authentication integration pending

## Verification Procedures

### Check Function Deployment

```powershell
# List deployed functions
az functionapp function list --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev --query "[].{name:name,status:config.disabled}" -o table
```

Expected:
```
Name                                      Status
----------------------------------------  --------
func-agents-dw7z4hg4ssn2k/PingStorage    False
func-agents-dw7z4hg4ssn2k/ProcessSupportEmail  False
```

### Verify Table Storage

```powershell
# List recent tickets
az storage entity query \
  --table-name SupportTickets \
  --account-name stagentsdw7z4hg4ssn2k \
  --select TicketID,Category,Priority,Title,Timestamp \
  --top 10 \
  --account-key <key>
```

### Check Application Insights Logs

```powershell
# View recent function executions
az monitor app-insights query \
  --app appi-smart-agents-dw7z4hg4ssn2k \
  --resource-group rg-smart-agents-dev \
  --analytics-query "traces | where timestamp > ago(10m) and operation_Name == 'ProcessSupportEmail' | order by timestamp desc | take 20" \
  --offset 10m
```

### Test Function Health

```powershell
# PingStorage (anonymous access)
$response = Invoke-RestMethod -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/pingstorage"
Write-Host "Ticket ID: $($response.ticketId)"
```

Expected: Returns a ticket ID like `1699876543210-abc123`

## Manual Testing Procedures

### Test ProcessSupportEmail Endpoint

```powershell
# Get function key
$functionKey = az functionapp keys list --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev --query "functionKeys.default" -o tsv

# Prepare test payload
$body = @{
    subject = "Test Ticket"
    body = "I need help with VPN connection. It keeps disconnecting."
    from = "test@example.com"
    receivedDateTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

# Call function
$response = Invoke-RestMethod `
    -Uri "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" `
    -Headers @{ "x-functions-key" = $functionKey }

# Verify response
Write-Host "Ticket ID: $($response.ticketId)"
Write-Host "Category: $($response.category)"
Write-Host "Priority: $($response.priority)"
```

### Test Knowledge Base Ingestion

```powershell
cd demos/02-rag-search

# Verify environment variables
$env:AZURE_AI_SEARCH_ENDPOINT
$env:AZURE_AI_SEARCH_API_KEY
$env:AZURE_OPENAI_ENDPOINT

# Run ingestion
python ingest-kb.py
```

Expected output:
```
Creating index 'kb-support'...
✓ Index created successfully

Processing knowledge base files...
[1/3] billing-guide.md
  → Generating embedding...
  ✓ Uploaded successfully

[2/3] password-reset.md
  → Generating embedding...
  ✓ Uploaded successfully

[3/3] vpn-troubleshooting.md
  → Generating embedding...
  ✓ Uploaded successfully

✓ Successfully indexed 3 documents
```

## Troubleshooting Guide

### Common Issues

#### 1. 401 Unauthorized on ProcessSupportEmail

**Symptom**: Test script returns 401 error

**Cause**: Missing or invalid function key

**Solution**:
```powershell
# Get function key
$key = az functionapp keys list --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev --query "functionKeys.default" -o tsv

# Update test script with correct key
# Or set as environment variable
$env:FUNCTION_KEY = $key
```

#### 2. 500 Internal Server Error

**Symptom**: Function returns 500 with "Missing required environment variables"

**Cause**: Function app settings not configured

**Solution**:
```powershell
# Check current settings
az functionapp config appsettings list --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev --query "[?name=='STORAGE_ACCOUNT_NAME' || name=='GRAPH_CLIENT_ID'].{name:name,value:value}" -o table

# If missing, redeploy infrastructure
az deployment sub create --location eastus --template-file infra/main.bicep --parameters @infra/parameters.dev.json
```

#### 3. TypeScript Compilation Errors

**Symptom**: `npm run build` fails

**Cause**: Type errors or missing dependencies

**Solution**:
```powershell
cd demos/04b-real-ticket-creation/function

# Clean and reinstall
Remove-Item -Recurse -Force node_modules, dist
npm install

# Build with verbose output
npm run build
```

#### 4. Table Storage Connection Failure

**Symptom**: "Failed to connect to storage account"

**Cause**: Invalid connection string or storage account key

**Solution**:
```powershell
# Get storage account key
$key = az storage account keys list --account-name stagentsdw7z4hg4ssn2k --resource-group rg-smart-agents-dev --query "[0].value" -o tsv

# Update function app setting
az functionapp config appsettings set \
  --name func-agents-dw7z4hg4ssn2k \
  --resource-group rg-smart-agents-dev \
  --settings "STORAGE_ACCOUNT_KEY=$key"
```

#### 5. RAG Function Returns 400/401

**Symptom**: RAG search endpoint returns authentication errors

**Cause**: Missing RAG_API_KEY in email processing function

**Solution**:
```powershell
# Get RAG function key
$ragKey = az functionapp keys list --name func-rag-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev --query "functionKeys.default" -o tsv

# Set in email processing function
az functionapp config appsettings set \
  --name func-agents-dw7z4hg4ssn2k \
  --resource-group rg-smart-agents-dev \
  --settings "RAG_API_KEY=$ragKey"

# Restart function app
az functionapp restart --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev
```

#### 6. Keyword Triage Misclassification

**Symptom**: Tickets classified as "Other" instead of correct category

**Cause**: Email text doesn't contain expected keywords

**Solution**:

Update keyword patterns in `demos/04b-real-ticket-creation/function/src/services/AIService.ts`:

```typescript
private keywordBasedTriage(emailBody: string): TriageResult {
  const text = emailBody.toLowerCase();
  
  // Add more keywords as needed
  let category = 'Other';
  if (text.includes('password') || text.includes('reset') || ...) {
    category = 'Access';
  }
  // ... more patterns
  
  return { category, priority };
}
```

Then rebuild and redeploy:
```powershell
cd demos/04b-real-ticket-creation/function
npm run build
func azure functionapp publish func-agents-dw7z4hg4ssn2k
```

### Debugging Tips

#### Enable Verbose Logging

Update `host.json`:
```json
{
  "version": "2.0",
  "logging": {
    "logLevel": {
      "default": "Information",
      "Function": "Trace"
    }
  }
}
```

#### View Live Logs

```powershell
# Stream function logs
func azure functionapp logstream func-agents-dw7z4hg4ssn2k --browser

# Or use Azure CLI
az webapp log tail --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev
```

#### Check Deployment Status

```powershell
# View deployment history
az functionapp deployment list-publishing-profiles --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev

# Check function runtime version
az functionapp config show --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev --query "{nodeVersion:nodeVersion,runtimeVersion:linuxFxVersion}"
```

## Performance Testing

### Load Testing

For load testing the ProcessSupportEmail endpoint:

```powershell
# Install Apache Bench (if not available, use alternatives like wrk or hey)

# Prepare test payload
$body = '{"subject":"Load Test","body":"VPN connection issue","from":"test@example.com"}'

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 -p payload.json -T "application/json" -H "x-functions-key: $functionKey" https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail
```

### Latency Benchmarks

Expected latencies (warm function):

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| Keyword Triage | 1ms | 2ms | 5ms |
| Table Storage Write | 50ms | 100ms | 150ms |
| RAG Search (future) | 800ms | 1500ms | 2000ms |
| **Total E2E** | 600ms | 1700ms | 2500ms |

## Test Data

### Sample Email Payloads

**VPN Issue**:
```json
{
  "subject": "VPN connection problems",
  "body": "I can't connect to the VPN. It says 'connection timeout' every time I try. This is urgent as I need to access internal systems.",
  "from": "employee@company.com",
  "receivedDateTime": "2025-11-12T10:30:00Z"
}
```

**Password Reset**:
```json
{
  "subject": "Can't log in",
  "body": "I forgot my password and can't sign in to my account. How do I reset it?",
  "from": "user@company.com",
  "receivedDateTime": "2025-11-12T11:00:00Z"
}
```

**Billing Question**:
```json
{
  "subject": "Invoice discrepancy",
  "body": "I was charged twice on my last invoice. Can you please review and issue a refund?",
  "from": "customer@company.com",
  "receivedDateTime": "2025-11-12T11:30:00Z"
}
```

## Continuous Integration

### GitHub Actions (Future)

Recommended CI pipeline:

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Build Functions
        run: |
          cd demos/04b-real-ticket-creation/function
          npm install
          npm run build
      
      - name: Run E2E Tests
        env:
          FUNCTION_KEY: ${{ secrets.FUNCTION_KEY }}
        run: |
          pwsh -File tests/e2e-test.ps1
```

## References

- [Azure Functions Testing](https://learn.microsoft.com/azure/azure-functions/functions-test-a-function)
- [Application Insights Monitoring](https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview)
- [PowerShell Testing Best Practices](https://pester.dev/)
