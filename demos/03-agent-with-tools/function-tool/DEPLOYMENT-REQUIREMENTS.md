# Azure Functions Deployment Requirements

## Critical Configuration

This document outlines **required** configuration for successful Azure Functions deployment.

### 1. TypeScript Configuration (`tsconfig.json`)

**REQUIRED**: The `rootDir` must be set to `"./src"` to ensure correct compilation output:

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  }
}
```

**Why**: Azure Functions expects the compiled structure to be:
```
dist/
├── index.js              ← Main entrypoint
├── GetOrderStatus/
│   └── index.js          ← Function handler
└── CreateTicket/
    └── index.js          ← Function handler
```

**If `rootDir` is set to `"./"` (WRONG)**, you'll get:
```
dist/
└── src/                  ← Extra nested folder!
    ├── index.js
    ├── GetOrderStatus/
    └── CreateTicket/
```

This causes 404 errors because Azure can't find the functions.

---

### 2. Package Configuration (`package.json`)

**REQUIRED**: The `main` entry must point to the compiled entrypoint:

```json
{
  "main": "dist/index.js"
}
```

**NOT**: `"main": "dist/src/index.js"` ❌

---

### 3. Entrypoint File (`src/index.ts`)

**REQUIRED**: A main entrypoint file that imports all function registrations:

```typescript
// Azure Functions v4 entrypoint
// This file imports all function registrations

import './GetOrderStatus/index';
import './CreateTicket/index';

// The app.http() calls in each function file register the functions
// No additional code needed here
```

**Why**: Azure Functions Node.js v4 needs a central registration point that imports all functions.

---

### 4. Function Structure

Each function must:

1. Import the `app` object from `@azure/functions`
2. Define the handler function
3. Register the function with `app.http()`

Example (`src/GetOrderStatus/index.ts`):

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function GetOrderStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Handler logic
  return { status: 200, jsonBody: { ... } };
}

// Register the function
app.http('GetOrderStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetOrderStatus,
});
```

---

## Deployment Process

### Automated (Recommended)

Run the complete deployment:

```powershell
.\scripts\deploy.ps1
```

This will:
1. Deploy infrastructure
2. Update `.env` with `/api` suffix in `AZURE_FUNCTION_APP_URL`
3. Validate function structure
4. Build and deploy functions
5. Ingest knowledge base

### Manual

If deploying functions manually:

```powershell
cd demos/03-agent-with-tools/function-tool

# 1. Verify configuration
#    - Check tsconfig.json rootDir is "./src"
#    - Check package.json main is "dist/index.js"
#    - Check src/index.ts exists

# 2. Clean and build
npm run clean
npm run build

# 3. Verify output structure
Get-ChildItem dist -Recurse -Name
# Should show:
#   index.js
#   GetOrderStatus/index.js
#   CreateTicket/index.js

# 4. Deploy
func azure functionapp publish <function-app-name> --typescript
```

---

## Environment Configuration

The `.env` file **must** include `/api` in the function URL:

```properties
AZURE_FUNCTION_APP_URL=https://<function-app>.azurewebsites.net/api
```

**NOT**: `https://<function-app>.azurewebsites.net` ❌

The agent client code appends the function name (e.g., `/GetOrderStatus`) to this base URL.

---

## Troubleshooting

### Functions return 404

**Symptoms**: 
- `func azure functionapp list-functions` shows no functions
- HTTP requests to `/api/GetOrderStatus` return 404

**Causes**:
1. Wrong `tsconfig.json` rootDir → Build outputs to `dist/src/` instead of `dist/`
2. Missing `src/index.ts` → No entrypoint to register functions
3. Wrong `package.json` main → Azure looks for `dist/src/index.js` instead of `dist/index.js`

**Fix**:
1. Update `tsconfig.json` with `"rootDir": "./src"`
2. Create `src/index.ts` with function imports
3. Update `package.json` with `"main": "dist/index.js"`
4. Rebuild and redeploy

### Agent can't reach functions

**Symptoms**: Agent shows "service unavailable" messages

**Causes**:
1. `.env` missing `/api` suffix
2. Function app not warmed up yet

**Fix**:
1. Ensure `AZURE_FUNCTION_APP_URL` ends with `/api`
2. Wait 1-2 minutes after deployment for cold start
3. Test endpoint directly: `Invoke-RestMethod -Uri "https://<app>.azurewebsites.net/api/GetOrderStatus?orderId=12345"`

---

## Verification Checklist

Before deploying:

- [ ] `tsconfig.json` has `"rootDir": "./src"`
- [ ] `package.json` has `"main": "dist/index.js"`
- [ ] `src/index.ts` exists and imports all functions
- [ ] Each function folder has `index.ts` with `app.http()` registration
- [ ] `.env` has `AZURE_FUNCTION_APP_URL` ending with `/api`

After deploying:

- [ ] `func azure functionapp list-functions <app-name>` shows both functions
- [ ] `Invoke-RestMethod` to `/api/GetOrderStatus?orderId=12345` returns order data
- [ ] Agent test (`npm run dev -- 'Where is order 12345?'`) succeeds

---

## References

- [Azure Functions Node.js v4 Documentation](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
