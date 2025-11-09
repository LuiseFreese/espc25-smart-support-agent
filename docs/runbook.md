# Operational Runbook

## Overview

This runbook provides step-by-step procedures for common operational tasks and incident response for the Smart Support Assistant system.

**On-Call Contacts:**
- **L1 Support**: support-team@example.com
- **L2 Engineering**: engineering-oncall@example.com
- **Platform/SRE**: sre-oncall@example.com (PagerDuty escalation)

---

## Health Check Procedures

### Verify System Health

Run these checks to validate the system is operational:

```bash
# 1. Check Azure resource health
az group show -n <resource-group-name> --query "properties.provisioningState"

# 2. Test Function App health endpoint
curl https://<function-app-name>.azurewebsites.net/api/health

# 3. Verify Search index exists
az search index show --service-name <search-service-name> --name kb-support

# 4. Test Azure OpenAI connectivity
curl -X POST https://<openai-endpoint>/openai/deployments/<deployment>/chat/completions?api-version=2024-08-01-preview \
  -H "api-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"max_tokens":5}'
```

### Application Insights Health Query

```kql
requests
| where timestamp > ago(15m)
| summarize 
    TotalRequests = count(),
    SuccessRate = countif(success == true) * 100.0 / count(),
    P95Duration = percentile(duration, 95)
| project TotalRequests, SuccessRate, P95Duration
```

**Expected:**
- TotalRequests > 0 (system is receiving traffic)
- SuccessRate > 99% (healthy state)
- P95Duration < 10,000ms (acceptable latency)

---

## Incident Response

### High Error Rate Alert

**Symptom**: Alert fires "Function failure rate >5% over 15 min"

**Diagnosis**:

```kql
requests
| where timestamp > ago(30m)
| where success == false
| summarize ErrorCount = count() by operation_Name, resultCode
| order by ErrorCount desc
```

**Common Causes**:

1. **Azure OpenAI throttling (429)**
   - **Action**: Check token usage; implement rate limiting
   - **Mitigation**: Enable retry logic; request quota increase

2. **Azure AI Search unavailable (503)**
   - **Action**: Check Search service health in Azure Portal
   - **Mitigation**: Enable graceful degradation (forward to human queue)

3. **Key Vault access denied (403)**
   - **Action**: Verify Managed Identity has correct RBAC roles
   - **Fix**: `az role assignment create --assignee <mi-principal-id> --role "Key Vault Secrets User" --scope <kv-id>`

4. **Invalid prompt format**
   - **Action**: Check recent flow.dag.yaml changes
   - **Fix**: Rollback to last known good version

**Escalation**: If error rate >20% for >30 min, page Platform SRE team.

---

### High Latency Alert

**Symptom**: Alert fires "P95 latency >10s over 15 min"

**Diagnosis**:

```kql
requests
| where timestamp > ago(30m)
| summarize P50 = percentile(duration, 50), P95 = percentile(duration, 95), P99 = percentile(duration, 99) by operation_Name
| order by P95 desc
```

**Common Causes**:

1. **LLM cold start**
   - **Symptom**: P99 spike, P50 normal
   - **Action**: No action required (auto-warms after first call)

2. **Search query slow**
   - **Symptom**: High duration for `retrieve` operation
   - **Action**: Check Search service metrics; consider caching popular queries

3. **Token limit exceeded**
   - **Symptom**: Timeout errors after 30s
   - **Action**: Reduce max_tokens or context window

4. **Dependency failure**
   - **Action**: Check `dependencies` table for failed calls

**Mitigation**:
- Enable Application Insights Profiler to identify bottlenecks
- Scale up Search tier if QPS consistently >40

---

### Logic App Not Triggering

**Symptom**: Emails with [Support] subject not processed

**Diagnosis**:

1. Check Logic App run history in Azure Portal
2. Verify Office 365 connector authentication
3. Test email trigger with manual run

**Common Causes**:

1. **Connector expired**
   - **Action**: Reauthorize Office 365 connection in Azure Portal
   - **Path**: Logic App → Connections → Office 365 → Authorize

2. **Trigger disabled**
   - **Action**: Check Logic App status; re-enable if disabled

3. **Email filter misconfigured**
   - **Action**: Verify subject contains filter is `[Support]` (case-sensitive)

**Test**:
```powershell
# Send test email from authorized account
Send-MailMessage -To "support@example.com" `
  -From "user@example.com" `
  -Subject "[Support] Test email" `
  -Body "This is a test ticket" `
  -SmtpServer "smtp.office365.com" `
  -UseSsl
```

---

## Common Maintenance Tasks

### 1. Disable Automation (Maintenance Window)

**Use Case**: Perform maintenance without triggering automated workflows

**Steps**:

```bash
# 1. Disable Logic App trigger
az logicapp update -g <resource-group> -n <logic-app-name> --state Disabled

# 2. Stop Function App (optional, for code deployment)
az functionapp stop -g <resource-group> -n <function-app-name>

# 3. Post maintenance: re-enable
az logicapp update -g <resource-group> -n <logic-app-name> --state Enabled
az functionapp start -g <resource-group> -n <function-app-name>
```

**Notification**: Post to #support-ops Slack: "Automated support disabled for maintenance. ETA: 30 min. Escalate urgent issues to support-team@example.com."

---

### 2. Rotate Function Keys

**Frequency**: Quarterly or after suspected exposure

**Steps**:

```bash
# 1. Generate new function key
az functionapp keys set -g <resource-group> -n <function-app-name> --key-name default --key-type functionKeys

# 2. Update Logic App with new key
# (Manual step in Azure Portal: Logic App → API connections → Update key)

# 3. Test connectivity
curl https://<function-app-name>.azurewebsites.net/api/GetOrderStatus?code=<new-key>&orderId=12345

# 4. Revoke old key
az functionapp keys delete -g <resource-group> -n <function-app-name> --key-name default-old
```

**Verification**: Check Logic App runs; ensure no 401 errors.

---

### 3. Purge Bad KB Article

**Use Case**: Remove incorrect or outdated KB article from Search index

**Steps**:

```bash
# 1. Identify problematic article
# Query: Find all citations in last 24h
# (Use Application Insights custom events)

# 2. Delete from Search index
az search index document delete \
  --service-name <search-service> \
  --index-name kb-support \
  --documents '[{"id":"article-vpn-legacy"}]'

# 3. Remove from source repo
rm sample-data/kb/vpn-legacy.md
git commit -m "Remove outdated VPN article"

# 4. Rebuild index (optional, if complete refresh needed)
npm run rebuild --prefix demos/02-rag-search/ingest
```

**Audit**: Query all answers citing the deleted article:

```kql
customEvents
| where name == "AnswerGenerated"
| extend citations = tostring(customDimensions.citations)
| where citations contains "vpn-legacy"
| project timestamp, user_Id, question = tostring(customDimensions.question)
```

**Follow-up**: Notify users who received answers from deleted article.

---

### 4. Rollback Prompt Flow

**Use Case**: New prompt version causes issues; revert to stable version

**Steps**:

```bash
# 1. Identify last known good commit
git log --oneline demos/01-triage-promptflow/prompts/

# 2. Checkout stable version
git checkout <commit-hash> -- demos/01-triage-promptflow/prompts/

# 3. Validate locally
pf flow test -f demos/01-triage-promptflow/flow.dag.yaml \
  --inputs ticket_text="VPN disconnects every 5 minutes"

# 4. Deploy to production
pf flow deploy -f demos/01-triage-promptflow/flow.dag.yaml

# 5. Monitor for errors
# (Use Application Insights query from Health Check section)
```

**Communication**: Post to #engineering: "Rolled back triage prompt to <commit-hash> due to classification errors. Monitoring for 30 min."

---

### 5. Update Environment Variables

**Use Case**: Change Azure OpenAI deployment, Search index, or config

**Steps**:

```bash
# 1. Update Key Vault secret (preferred method)
az keyvault secret set --vault-name <vault-name> \
  --name AZURE-OPENAI-DEPLOYMENT \
  --value gpt-4o-2024-11-20

# 2. Restart Function App to pick up new value
az functionapp restart -g <resource-group> -n <function-app-name>

# 3. Verify new value in use
curl https://<function-app-name>.azurewebsites.net/api/health | jq '.checks'
```

**Alternative (App Settings)**:

```bash
az functionapp config appsettings set -g <resource-group> -n <function-app-name> \
  --settings "AZURE_OPENAI_DEPLOYMENT=gpt-4o-2024-11-20"
```

**Validation**: Run test query; check Application Insights for correct deployment name in traces.

---

## Monitoring Queries

### Recent Successful Resolutions

```kql
customEvents
| where name == "EmailReplySent"
| where timestamp > ago(1h)
| extend ticketId = tostring(customDimensions.ticket_id)
| extend duration = toint(customDimensions.resolution_time_ms)
| project timestamp, ticketId, duration
| order by timestamp desc
| take 20
```

---

### Top 10 Intents by Volume

```kql
customEvents
| where name == "TicketClassified"
| where timestamp > ago(7d)
| extend category = tostring(customDimensions.category)
| summarize Count = count() by category
| order by Count desc
| take 10
```

---

### Failure Rate by Step

```kql
requests
| where timestamp > ago(1h)
| summarize 
    Total = count(),
    Failures = countif(success == false),
    FailureRate = round(countif(success == false) * 100.0 / count(), 2)
    by operation_Name
| where FailureRate > 0
| order by FailureRate desc
```

---

### Token Cost per Resolved Ticket

```kql
customMetrics
| where name in ("tokens_input", "tokens_output")
| where timestamp > ago(24h)
| summarize 
    TotalInputTokens = sumif(value, name == "tokens_input"),
    TotalOutputTokens = sumif(value, name == "tokens_output")
| extend 
    InputCost = TotalInputTokens / 1000000.0 * 0.15,
    OutputCost = TotalOutputTokens / 1000000.0 * 0.60,
    TotalCost = InputCost + OutputCost
| project TotalInputTokens, TotalOutputTokens, TotalCost
```

**Note**: Update pricing based on current Azure OpenAI rates.

---

### Mean Time to Resolution (MTTR) Trend

```kql
customEvents
| where name == "EmailReplySent"
| where timestamp > ago(30d)
| extend duration = toint(customDimensions.resolution_time_ms)
| summarize 
    AvgMTTR = avg(duration) / 1000.0,
    P50 = percentile(duration, 50) / 1000.0,
    P95 = percentile(duration, 95) / 1000.0
    by bin(timestamp, 1d)
| project timestamp, AvgMTTR, P50, P95
| render timechart
```

---

## Disaster Recovery

### Scenario: Complete Azure Region Outage

**RTO**: 1 hour  
**RPO**: 15 minutes

**Steps**:

1. **Verify outage**: Check Azure Status Dashboard
2. **Activate secondary region** (if multi-region deployment exists)
3. **Rebuild Search index** from Git-backed KB:
   ```bash
   npm run rebuild --prefix demos/02-rag-search/ingest
   ```
4. **Restore Function App** from ARM template:
   ```bash
   az deployment group create -g <backup-rg> -f infra/main.bicep
   ```
5. **Update DNS/email routing** to secondary region
6. **Verify health checks** pass
7. **Notify stakeholders** of restored service

---

### Scenario: Corrupted Search Index

**Steps**:

1. **Backup current index** (if possible):
   ```bash
   az search index show --service-name <name> --name kb-support > backup.json
   ```

2. **Delete corrupted index**:
   ```bash
   az search index delete --service-name <name> --name kb-support --yes
   ```

3. **Rebuild from source**:
   ```bash
   npm run rebuild --prefix demos/02-rag-search/ingest
   ```

4. **Verify document count**:
   ```bash
   az search index show --service-name <name> --name kb-support --query "fields[?name=='id'].name"
   ```

**Expected recovery time**: 30 minutes for 500 articles.

---

## Escalation Matrix

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| **P0 - Critical** | 15 min | L1 → L2 Engineering → SRE → Management |
| **P1 - High** | 1 hour | L1 → L2 Engineering |
| **P2 - Medium** | 4 hours | L1 → L2 Engineering (next business day) |
| **P3 - Low** | 24 hours | L1 (backlog) |

**Critical Criteria (P0)**:
- Complete system outage affecting all users
- Security breach or data leak
- Azure service incident impacting SLA
- Regulatory compliance violation

---

## Change Management

### Deployment Checklist

Before deploying to production:

- [ ] Changes tested in dev environment
- [ ] Unit tests pass (`npm test`)
- [ ] Prompt flow validation passes (`pf flow validate`)
- [ ] Evaluation metrics stable (accuracy ≥90%)
- [ ] Stakeholder approval obtained
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Runbook updated

### Post-Deployment

- [ ] Health checks pass (see Health Check Procedures)
- [ ] Monitor for 30 min (check error rate, latency)
- [ ] Verify sample ticket processed correctly
- [ ] Update status page / Slack notification

---

**Document Owner**: SRE & Operations Team  
**Last Updated**: November 9, 2025  
**Emergency Contact**: sre-oncall@example.com (PagerDuty)
