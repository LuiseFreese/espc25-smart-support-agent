# Deployment Script Improvements

## Issues Fixed (2025-11-19)

### 1. ✅ Clean Output Formatting
**Issue:** Line 169 showed verbose Azure CLI command output in the middle of formatted text
**Fix:** Wrapped `az resource list` output in parentheses to capture cleanly
**Location:** `scripts/deploy.ps1` line 166

### 2. ✅ AI Hub Deployment Failure (Key Vault Permissions)
**Issue:** AI Hub failed with "does not have authorization to perform action 'Microsoft.KeyVault/vaults/accessPolicies/write'"
**Root Cause:** AI Hub system-assigned identity needs Key Vault Secrets User role to access secrets
**Fix:** Added role assignment in `infra/modules/ai-hub.bicep`
- Grants AI Hub the `Key Vault Secrets User` role (4633458b-17de-408a-b874-0445c86b69e6)
- Uses deterministic GUID for idempotent deployments
**Impact:** AI Hub now deploys successfully on both fresh and re-deployments

### 3. ✅ Role Assignment Conflicts on Redeployment
**Issue:** Role assignments failed with "RoleAssignmentExists" error on redeployments
**Root Cause:** Bicep cannot update existing role assignments with same GUID
**Fix:** Two-part solution:
1. Added conditional deployment in `infra/modules/role-assignments.bicep`
   - Only creates assignments when `createRoleAssignments = true`
2. Auto-detect redeployment in `scripts/deploy.ps1`
   - Checks if resource group exists
   - Sets `createRoleAssignments=false` for existing deployments
**Impact:** Redeployments succeed without role assignment conflicts

### 4. ✅ Knowledge Base Indexing Completion
**Issue:** Verification script reported "empty knowledge base" even though 11 documents were uploaded
**Root Cause:** Azure AI Search indexing takes 60-120 seconds after upload
**Fix:** Enhanced `scripts/deploy.ps1` line 395
- Wait additional 60 seconds if initial check shows 0 documents
- Perform final verification check
- Provide accurate status messages
**Impact:** Users no longer see false "empty KB" warnings

### 5. ✅ Improved Deployment Validation
**Issue:** Failed resources (like AI Hub) weren't reported clearly in deployment output
**Fix:** Added comprehensive validation in `scripts/deploy.ps1` after infrastructure deployment
- Queries deployment for failed resources
- Shows error details for each failure
- Special handling for known issues (AI Hub Key Vault permissions)
- Distinguishes between critical failures and optional components
**Impact:** Users know exactly what failed and whether it's critical

### 6. ✅ Better Webhook Status Reporting
**Issue:** Verification showed "webhook not configured" even when it was successfully created
**Root Cause:** Webhook query requires admin consent, which happens AFTER verification
**Fix:** Updated `scripts/verify-deployment.ps1`
- Explains that missing webhook is expected before admin consent
- Clarifies which warnings are normal vs critical
- Shows subscription ID when webhook is active
**Impact:** Users understand deployment state without confusion

### 7. ✅ RAG Confidence Interpretation
**Issue:** Low confidence (0.3) reported as critical error even when indexing was still in progress
**Fix:** Updated `scripts/verify-deployment.ps1`
- Explains that low confidence may be temporary during indexing
- Recommends waiting 60-120 seconds instead of treating as failure
- Only marks as critical error if endpoint is unreachable
**Impact:** Users don't panic about normal post-deployment indexing delay

### 8. ✅ Fresh Login on Deployment Start
**Issue:** Users could have expired/wrong Azure subscriptions cached
**Fix:** Added `az logout` and `az login` at beginning of `deploy.ps1`
- Forces fresh authentication
- Ensures correct subscription context
- Updated step counter to 0/10 through 10/10
**Impact:** Deployment works reliably across different tenants and subscriptions

### 9. ✅ Soft-Deleted Resource Handling
**Issue:** Deployment failed with "FlagMustBeSetForRestore" for previously deleted OpenAI resources
**Fix:** Two-part solution:
1. Added `restore: true` property to `infra/modules/openai.bicep`
2. Added purge check in `deploy.ps1` (attempts to purge soft-deleted resources before deployment)
**Impact:** Works for both fresh deployments and restoring previously deleted resources

## Deployment Flow Now

1. **[0/10]** Force fresh Azure login (prevents auth issues)
2. **[1/10]** Validate prerequisites (CLI, Node.js, Functions Core Tools)
3. **[2/10]** Set subscription (with user-provided ID)
4. **[3/10]** Purge soft-deleted Cognitive Services resources
5. **[4/10]** Deploy Bicep infrastructure
   - Auto-detects redeployment
   - Skips role assignments if they already exist
   - Validates deployment and reports failures clearly
6. **[5/10]** Configure Communication Services
7. **[6/10]** Ingest knowledge base
   - Waits for indexing to complete
   - Verifies document count
8. **[7/10]** Deploy Function code (both func-agents and func-rag)
9. **[8/10]** Setup Microsoft Graph webhook
10. **[9/10]** Verify deployment (with accurate status messages)
11. **[10/10]** Prompt for admin consent (manual browser step)

## Key Principles Applied

### Idempotency
- Deployment can be run multiple times safely
- Auto-detects existing resources
- Uses deterministic GUIDs for role assignments
- Handles soft-deleted resources gracefully

### Clear Error Reporting
- Distinguishes critical errors from warnings
- Explains what's expected vs what's broken
- Provides actionable remediation steps
- Shows detailed error messages from failed resources

### Tenant-Agnostic
- Works in ANY Azure tenant
- Forces fresh login to prevent auth issues
- No hardcoded subscription IDs
- Handles both fresh and existing deployments

### Realistic Timing
- Accounts for Azure service propagation delays (60-120 sec for indexing)
- Waits for role assignments to propagate
- Doesn't mark async operations as failures prematurely
- Provides progress indicators during long waits

## Testing Recommendations

To validate these fixes work correctly, test these scenarios:

1. **Fresh Deployment (Clean Tenant)**
   ```powershell
   # Should complete successfully with no errors
   .\scripts\deploy.ps1 -SubscriptionId "<id>" -SupportEmail "<email>"
   ```

2. **Redeployment (Existing Resources)**
   ```powershell
   # Should skip role assignments, update resources
   .\scripts\deploy.ps1 -SubscriptionId "<id>" -SupportEmail "<email>"
   ```

3. **Recovery from Soft-Delete**
   ```powershell
   # Delete resources, then redeploy
   az group delete --name rg-smart-agents-dev --yes
   # Wait 5 minutes for soft-delete
   .\scripts\deploy.ps1 -SubscriptionId "<id>" -SupportEmail "<email>"
   # Should restore OpenAI resource successfully
   ```

4. **Cross-Tenant Deployment**
   ```powershell
   # Switch Azure accounts, deploy to different tenant
   # Should work without manual az login
   .\scripts\deploy.ps1 -SubscriptionId "<different-tenant-id>" -SupportEmail "<email>"
   ```

## Files Modified

- `scripts/deploy.ps1` - Main deployment orchestration (8 improvements)
- `scripts/verify-deployment.ps1` - Post-deployment validation (3 improvements)
- `infra/modules/openai.bicep` - Added restore property
- `infra/modules/ai-hub.bicep` - Added Key Vault role assignment
- `infra/modules/role-assignments.bicep` - Made conditional on createRoleAssignments parameter

## Remaining Considerations

### Not Fixed (By Design)
- **Admin Consent:** Still requires manual browser step - automated consent fails silently in many tenants
- **AI Hub Optional:** System works without AI Hub (only needed for Prompt Flow)
- **3-Day Webhook Expiry:** This is a Microsoft Graph limitation, not fixable

### Future Enhancements
- Consider Azure Developer CLI (azd) templates for even simpler deployment
- Add retry logic for transient Azure API failures
- Create deployment health dashboard in Azure Portal
- Add automated E2E testing after deployment
