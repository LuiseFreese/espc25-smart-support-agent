# Demos UI Deployment Guide

## Architecture

**Frontend**: React + Vite + Fluent UI v9 (deployed to Azure Static Web Apps)  
**Backend**: Express.js + TypeScript (runs locally or on App Service)

**Why Separate?** The Express backend uses complex middleware (multer uploads, rate limiting, streaming) that's difficult to convert to Azure Functions format. Keeping it as Express is simpler.

## Prerequisites

1. **Azure CLI**: `az --version` (2.0+)
2. **SWA CLI**: `npm install -g @azure/static-web-apps-cli`
3. **Node.js**: v20+
4. **Azure Subscription**: With contributor access

## Deployment Steps

### Option A: Frontend Only (Recommended for Demos)

Deploy just the UI to Azure Static Web Apps, backend stays local:

```powershell
# 1. Deploy frontend to Azure
.\scripts\deploy-demos-ui.ps1 -ResourceGroup "rg-smart-agents-dev"

# 2. Start backend locally
cd demos-ui/backend
npm install
npm run dev

# 3. Access demo UI
# Frontend: https://swa-smart-agents-demos.azurestaticapps.net
# Backend: http://localhost:3001 (must be running)
```

**Pros**: Simple deployment, easy debugging, no backend conversion needed  
**Cons**: Backend must run locally, not fully cloud-hosted

### Option B: Full Cloud Deployment (App Service + SWA)

Deploy both frontend and backend to Azure:

**Backend to App Service:**
```powershell
# 1. Create App Service Plan
az appservice plan create `
    --name asp-demos-backend `
    --resource-group rg-smart-agents-dev `
    --sku B1 `
    --is-linux

# 2. Create Web App
az webapp create `
    --name app-demos-backend-<uniqueid> `
    --resource-group rg-smart-agents-dev `
    --plan asp-demos-backend `
    --runtime "NODE:20-lts"

# 3. Configure environment variables
az webapp config appsettings set `
    --name app-demos-backend-<uniqueid> `
    --resource-group rg-smart-agents-dev `
    --settings `
        AZURE_OPENAI_ENDPOINT="<from-key-vault>" `
        AZURE_OPENAI_API_KEY="<from-key-vault>" `
        AZURE_AI_SEARCH_ENDPOINT="<from-key-vault>" `
        AZURE_AI_SEARCH_API_KEY="<from-key-vault>" `
        RAG_API_ENDPOINT="<rag-function-url>" `
        RAG_API_KEY="<from-key-vault>"

# 4. Deploy backend code
cd demos-ui/backend
npm install
npm run build
az webapp deployment source config-zip `
    --name app-demos-backend-<uniqueid> `
    --resource-group rg-smart-agents-dev `
    --src backend-deploy.zip
```

**Frontend to Static Web Apps:**
```powershell
# 1. Update frontend API base URL
# Edit demos-ui/frontend/.env.production:
VITE_API_BASE_URL=https://app-demos-backend-<uniqueid>.azurewebsites.net

# 2. Deploy frontend
.\scripts\deploy-demos-ui.ps1 -ResourceGroup "rg-smart-agents-dev"
```

**Pros**: Fully cloud-hosted, no local dependencies  
**Cons**: More complex, additional costs (App Service B1 ~$13/month)

### Option C: Local Development

Run both frontend and backend locally:

```powershell
# Terminal 1: Backend
cd demos-ui/backend
npm install
npm run dev

# Terminal 2: Frontend  
cd demos-ui/frontend
npm install
npm run dev

# Access: http://localhost:5173
```

## Environment Variables

**Backend** (`demos-ui/backend/.env`):
```env
AZURE_OPENAI_ENDPOINT=https://openai-<uniqueid>.openai.azure.com
AZURE_OPENAI_API_KEY=<from-key-vault>
AZURE_AI_SEARCH_ENDPOINT=https://search-<uniqueid>.search.windows.net
AZURE_AI_SEARCH_API_KEY=<from-key-vault>
RAG_API_ENDPOINT=https://func-rag-<uniqueid>.azurewebsites.net/api/rag-search
RAG_API_KEY=<from-key-vault>
PORT=3001
```

**Frontend** (`.env.production` or `.env.development`):
```env
VITE_API_BASE_URL=http://localhost:3001  # Local backend
# OR
VITE_API_BASE_URL=https://app-demos-backend-<uniqueid>.azurewebsites.net  # Cloud backend
```

## Troubleshooting

**Frontend shows "Network Error":**
- Check backend is running (`npm run dev` in `demos-ui/backend`)
- Verify `VITE_API_BASE_URL` matches backend URL
- Check browser console for CORS errors

**Backend crashes with "AZURE_OPENAI_ENDPOINT not found":**
- Copy `.env.example` to `.env` in `demos-ui/backend`
- Populate with values from Key Vault or deployment output

**Static Web Apps deployment fails:**
- Check SWA CLI installed: `swa --version`
- Verify Azure login: `az account show`
- Check resource group exists: `az group show -n rg-smart-agents-dev`

## Recommended Setup for Demos

1. **Deploy Frontend to Azure** (always accessible via URL)
2. **Run Backend Locally** (easy debugging, no additional Azure costs)
3. **Before Demo**: Start backend with `npm run dev`
4. **During Demo**: Share Azure SWA URL, audience sees production UI

This hybrid approach gives you the best of both worlds: public-facing UI + flexible backend development.
