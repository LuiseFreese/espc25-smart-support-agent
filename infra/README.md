# Infrastructure Deployment

This directory contains Bicep templates for deploying Azure resources required for the Smart Support Agent.

## Resources Deployed

- **Azure AI Search** (Standard S1) - For knowledge base indexing and retrieval
- **Storage Account** - For storing documents and function app data
- **Log Analytics Workspace** - For centralized logging
- **Application Insights** - For monitoring and telemetry
- **App Service Plan** (Linux, B1) - For hosting Azure Functions
- **Function App** (Node 20) - For tool execution endpoints
- **Key Vault** - For secure credential storage

## Deployment Options

### Option 1: Azure CLI

```bash
# Login to Azure
az login
az account set -s <subscription-id>

# Create deployment
az deployment sub create \
  --name smart-agents-deployment \
  --location eastus \
  --template-file main.bicep \
  --parameters @parameters.dev.json

# Get outputs
az deployment sub show \
  --name smart-agents-deployment \
  --query properties.outputs
```

### Option 2: Azure Developer CLI (azd)

```bash
# Initialize (first time only)
azd init

# Provision and deploy
azd up

# Get environment variables
azd env get-values
```

## Export Outputs to .env

After deployment, extract the outputs and add them to your `.env` file:

```bash
# Get the deployment outputs
az deployment sub show \
  --name smart-agents-deployment \
  --query properties.outputs -o json > outputs.json

# Manually copy values to .env or use this script:
# (Create scripts/export-outputs.sh for automation)
```

Example `.env` from outputs:

```env
AZURE_AI_SEARCH_ENDPOINT=<searchEndpoint.value>
AZURE_AI_SEARCH_API_KEY=<searchAdminKey.value>
APPINSIGHTS_CONNECTION_STRING=<appInsightsConnectionString.value>
AZURE_STORAGE_CONNECTION_STRING=<storageConnectionString.value>
AZURE_FUNCTION_APP_URL=<functionAppUrl.value>
AZURE_KEY_VAULT_URI=<keyVaultUri.value>
```

## Updating Parameters

Edit `parameters.dev.json` to customize:

- `location` - Azure region (default: eastus)
- `environmentName` - Environment suffix (dev, staging, prod)

## Clean Up

To delete all resources:

```bash
# Delete the resource group
az group delete --name rg-smart-agents-dev --yes --no-wait
```

## Module Structure

```
infra/
├── main.bicep                    # Main template (subscription scope)
├── parameters.dev.json           # Development parameters
└── modules/
    ├── search.bicep              # Azure AI Search
    ├── storage.bicep             # Storage Account
    ├── log-analytics.bicep       # Log Analytics Workspace
    ├── app-insights.bicep        # Application Insights
    ├── hosting-plan.bicep        # App Service Plan
    ├── function-app.bicep        # Function App
    └── key-vault.bicep           # Key Vault
```
