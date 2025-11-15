# Authentication Architecture

## Overview

This deployment uses **two different authentication mechanisms** for different purposes:

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYERS                     │
└─────────────────────────────────────────────────────────────┘

Production (Function App):
┌──────────────────┐
│ Function App     │
│ (Node.js)        │
└────────┬─────────┘
         │
         │ Uses System-Assigned
         │ Managed Identity
         │ (NO API KEYS!)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Azure OpenAI        Azure AI Search       Key Vault         │
│  ✓ RBAC Role         ✓ RBAC Role           ✓ Access Policy   │
└─────────────────────────────────────────────────────────────┘

Development (Portal Access):
┌──────────────────┐
│ You (Developer)  │
│ via Azure Portal │
└────────┬─────────┘
         │
         │ Uses Azure AD User Identity
         │ (OPTIONAL - for debugging)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Key Vault Only                                              │
│  ✓ Access Policy (view secrets in portal)                   │
└─────────────────────────────────────────────────────────────┘
```

## 1. Production: Managed Identity (Function App)

### What It Is
- **System-Assigned Managed Identity**: Azure automatically creates an Azure AD identity for the Function App
- **No secrets stored**: Function App authenticates using tokens managed by Azure
- **Automatic rotation**: Azure handles all credential lifecycle

### What It Accesses
```bicep
// Configured in infra/modules/role-assignments.bicep

1. Azure OpenAI
   Role: "Cognitive Services OpenAI User"
   Purpose: Call chat completions API, generate embeddings
   
2. Azure AI Search  
   Role: "Search Index Data Reader"
   Purpose: Query kb-support index
   
3. Key Vault
   Permission: Get, List secrets
   Purpose: Read configuration (if needed)
```

### How It Works
```typescript
// In Function App code (demos/03-agent-with-tools/function-tool/)

import { DefaultAzureCredential } from '@azure/identity';

// DefaultAzureCredential automatically uses:
// - Managed Identity when running in Azure
// - Azure CLI auth when running locally
const credential = new DefaultAzureCredential();

const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT,
  credential  // <-- NO API KEY!
);
```

### Benefits
- **Secure**: No keys in config, code, or environment variables
- **Auditable**: All access logged in Azure AD
- **Zero maintenance**: No rotation, no expiration
- **Principle of least privilege**: Only granted specific roles needed

## 2. Development: User Access (Optional)

### What It Is
- **Your Azure AD user account**: luisefreese@hscluise.onmicrosoft.com
- **Portal access only**: So you can view/debug secrets in Azure Portal
- **Completely optional**: Not required for application to function

### What It Accesses
```bicep
// Configured in infra/modules/role-assignments.bicep

Key Vault ONLY
  Permission: Get, List secrets
  Purpose: View secrets in Azure Portal for debugging
```

### When It's Used
```
Scenario 1: Debugging deployment
├─ You: "Let me check what's in Key Vault..."
├─ Portal: Opens Key Vault → Secrets
└─ Result: ✓ You can see secret values

Scenario 2: Troubleshooting function
├─ You: "What's the OpenAI endpoint configured?"
├─ Portal: Key Vault → Secrets → AZURE_OPENAI_ENDPOINT
└─ Result: ✓ You can view the value

Scenario 3: Production (user access removed)
├─ You: Try to view Key Vault secrets
├─ Portal: Access Denied (403 Forbidden)
└─ Result: ✓ Function App still works (uses Managed Identity)
```

### How It's Configured
```powershell
# In scripts/deploy.ps1

# Automatically gets your Object ID
$currentUser = Get-AzADUser -UserPrincipalName $context.Account.Id
$userObjectId = $currentUser.Id

# Passes to Bicep
New-AzSubscriptionDeployment `
  -currentUserObjectId $userObjectId  # <-- OPTIONAL parameter
```

### Why It's Optional
```
Production Deployment:
├─ Don't pass -currentUserObjectId
├─ Only Function App has access (Managed Identity)
└─ Most secure: Zero human access to secrets

Development Deployment:
├─ Pass -currentUserObjectId (your Object ID)
├─ You + Function App have access
└─ Convenient: Can debug secrets in portal
```

## Key Differences

| Aspect | Managed Identity (Production) | User Access (Development) |
|--------|-------------------------------|---------------------------|
| **Purpose** | Application runtime access | Portal debugging |
| **Who** | Function App | You (developer) |
| **What** | OpenAI + Search + Key Vault | Key Vault only |
| **Required** | ✅ YES (app won't work without it) | ❌ NO (optional convenience) |
| **Configured By** | Bicep (automatic) | Bicep (if objectId provided) |
| **Security** | High (Azure-managed tokens) | Medium (user credentials) |
| **Production** | ✅ Always use | ❌ Remove before production |

## Common Questions

### Q: Why does the Function App need Key Vault access if it uses Managed Identity?
**A:** It doesn't strictly need it for OpenAI/Search (uses tokens). Key Vault access is for:
- Configuration secrets (connection strings, third-party API keys)
- Feature flags or dynamic configuration
- Backward compatibility if some services don't support Managed Identity

### Q: Why not just give the user OpenAI/Search access directly?
**A:** The user (developer) should access those through:
- Azure Portal UI for OpenAI (Playground, deployments)
- Azure Portal UI for Search (Search Explorer)
- NOT through API keys (security risk)

### Q: Can I skip the user access entirely?
**A:** Yes! Just don't pass `-currentUserObjectId` parameter:
```powershell
# Production deployment (no user access)
.\scripts\deploy.ps1
```

The Function App will still work perfectly - it only uses Managed Identity.

### Q: What if I need to debug secrets in production?
**A:** Use Azure RBAC roles:
```powershell
# Grant temporary access
New-AzRoleAssignment `
  -ObjectId $userObjectId `
  -RoleDefinitionName "Key Vault Secrets User" `
  -Scope "/subscriptions/.../vaults/kv-agents-*"

# Remove after debugging
Remove-AzRoleAssignment ...
```

## Summary

**Managed Identity (Required)**
```
Function App → [Managed Identity] → Azure OpenAI / Search / Key Vault
Purpose: Production access (secure, automatic)
```

**User Access (Optional)**
```
Developer → [Azure AD User] → Key Vault (view only)
Purpose: Debugging during development (convenience)
```

**Best Practice:**
- Always use Managed Identity for applications
- Minimize human access to secrets
- Remove user access before production deployment
- Use Azure Portal UIs instead of direct secret access
