# Complete Deployment Guide

This guide walks through deploying the entire Azure Smart Support Agent system from scratch.

## Prerequisites

- Azure subscription with Owner or Contributor role
- Azure CLI installed
- Node.js 20.x installed
- Azure Functions Core Tools v4 installed
- PowerShell 7+ (for scripts)

## Part 1: Deploy Infrastructure

### 1.1 Login to Azure

```powershell
# Login to Azure
az login

# Set the subscription
az account set -s <your-subscription-id>

# Verify you're in the right subscription
az account show
```

### 1.2 Deploy Bicep Infrastructure

```powershell
# Navigate to project root
cd c:\Users\luise.fixed\dev\espc25

# Deploy infrastructure at subscription level
az deployment sub create `
  --location eastus `
  --template-file infra/main.bicep `
  --parameters @infra/parameters.dev.json
```

This creates:
- Resource Group: `rg-smart-agents-dev`
- Azure OpenAI Service
- Azure AI Search
- Azure AI Hub (Machine Learning workspace)
- Application Insights
- Log Analytics Workspace
- Storage Account
- Function App (hosting plan + app)
- Key Vault

**Important**: If the AI Hub/ML workspace wasn't created by Bicep, create it manually:

```powershell
# Create Azure Machine Learning workspace (AI Hub)
az ml workspace create `
  --name mlw-smart-agents-dev `
  --resource-group rg-smart-agents-dev `
  --location eastus

# Create a compute instance (optional, for development)
az ml compute create `
  --name cpu-cluster `
  --type ComputeInstance `
  --size Standard_DS3_v2 `
  --resource-group rg-smart-agents-dev `
  --workspace-name mlw-smart-agents-dev
```

### 1.3 Capture Output Values

```powershell
# Get the deployment outputs
az deployment sub show `
  --name main `
  --query properties.outputs
```

Save these values - you'll need them for configuration:
- `functionAppName`
- `openAiEndpoint`
- `openAiKey`
- `searchEndpoint`
- `searchKey`
- `appInsightsConnectionString`

## Part 2: Set Up Azure AI Foundry / ML Workspace

### 4.1 Install Azure ML Extension

```powershell
# Install the Azure ML CLI extension
az extension add --name ml

# Or upgrade if already installed
az extension update --name ml
```

### 4.2 Configure Default Workspace

```powershell
# Set the resource group as default
az config set defaults.group=rg-smart-agents-dev

# Set the workspace as default (use the AI Hub name from infrastructure deployment)
az config set defaults.workspace=<ai-hub-name>

# Verify configuration
az config get
```

### 4.3 Create Connections to Azure OpenAI

```powershell
# Navigate to project root
cd c:\Users\luise.fixed\dev\espc25

# Create Azure OpenAI connection
az ml connection create `
  --file connection-azureml.yaml `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>

# Verify connection was created
az ml connection list `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>
```

**connection-azureml.yaml** should contain:
```yaml
$schema: https://azuremlschemas.azureedge.net/latest/azureOpenAIConnection.schema.json
name: aoai-connection
type: azure_open_ai
api_key: <your-openai-key>
azure_endpoint: <your-openai-endpoint>
api_version: 2024-08-01-preview
```

### 4.4 Create Azure AI Search Connection

```powershell
# Create search connection
az ml connection create `
  --file search-connection.yaml `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>
```

**search-connection.yaml**:
```yaml
$schema: https://azuremlschemas.azureedge.net/latest/cognitiveSearchConnection.schema.json
name: search-connection
type: cognitive_search
api_key: <your-search-key>
endpoint: <your-search-endpoint>
```

## Part 5: Deploy Prompt Flows

### 5.1 Install Prompt Flow CLI

```powershell
# Install promptflow tools
pip install promptflow promptflow-tools promptflow-azure

# Or upgrade
pip install --upgrade promptflow promptflow-tools promptflow-azure
```

### 5.2 Connect Prompt Flow to Azure

```powershell
# Login to Azure with PF
pf connection create `
  --file connection.yaml `
  --name aoai-connection

# Verify connections
pf connection list
```

### 5.3 Deploy Triage Flow

```powershell
# Navigate to triage flow
cd demos/01-triage-promptflow

# Test flow locally first
pf flow test `
  --flow ./flow.dag.yaml `
  --inputs ticket_text="VPN disconnects every 5 minutes"

# Create deployment
az ml online-deployment create `
  --file deployment.yaml `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>

# Get endpoint details
az ml online-endpoint show `
  --name triage-endpoint `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>
```

Copy the `scoring_uri` and get the key:
```powershell
az ml online-endpoint get-credentials `
  --name triage-endpoint `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>
```

### 5.4 Ingest Knowledge Base to Azure AI Search

```powershell
# Navigate to RAG search ingest
cd ../02-rag-search/ingest

# Install dependencies
npm install

# Set environment variables
$env:AZURE_SEARCH_ENDPOINT = "<your-search-endpoint>"
$env:AZURE_SEARCH_API_KEY = "<your-search-key>"
$env:AZURE_SEARCH_INDEX = "kb-support"
$env:AZURE_OPENAI_ENDPOINT = "<your-openai-endpoint>"
$env:AZURE_OPENAI_API_KEY = "<your-openai-key>"
$env:AZURE_OPENAI_EMBEDDING_DEPLOYMENT = "text-embedding-3-large"

# Run ingestion
npm run dev
```

### 5.5 Deploy RAG Flow

```powershell
# Navigate to RAG flow
cd ../

# Test locally
pf flow test `
  --flow ./flow.dag.yaml `
  --inputs question="How do I reset my password?"

# Deploy
az ml online-deployment create `
  --file deployment.yaml `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>

# Get endpoint details
az ml online-endpoint show `
  --name rag-endpoint `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>

# Get credentials
az ml online-endpoint get-credentials `
  --name rag-endpoint `
  --resource-group rg-smart-agents-dev `
  --workspace-name <ai-hub-name>
```

Copy the endpoint URL and API key.

## Part 6: Configure Function App

### 6.1 Set Application Settings

```powershell
# Set all required environment variables
az functionapp config appsettings set `
  --name <functionAppName> `
  --resource-group rg-smart-agents-dev `
  --settings `
    "STORAGE_ACCOUNT_NAME=<storage-account-name>" `
    "STORAGE_ACCOUNT_KEY=<storage-account-key>" `
    "TRIAGE_ENDPOINT=<triage-endpoint-url>" `
    "TRIAGE_API_KEY=<triage-api-key>" `
    "RAG_ENDPOINT=<rag-endpoint-url>" `
    "RAG_API_KEY=<rag-api-key>" `
    "SUPPORT_REPLY_FROM=helpdesk@yourdomain.com"
```

### 6.2 Deploy Function Code

```powershell
# Navigate to function directory
cd demos/04-real-ticket-creation/function

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Azure
func azure functionapp publish <functionAppName>
```

### 6.3 Verify Deployment

```powershell
# Test connectivity
Invoke-RestMethod -Uri "https://<functionAppName>.azurewebsites.net/api/pingstorage"
```

Expected response:
```json
{
  "success": true,
  "rowKey": "1234567890-abc123",
  "message": "Table Storage connectivity test passed"
}
```

## Part 7: Set Up Email Processing (Optional)

### 7.1 Create Timer Trigger

Add to `function/src/functions/TimerTrigger.ts`:

```typescript
import { app, InvocationContext, Timer } from '@azure/functions';
import { ProcessSupportEmail } from './ProcessSupportEmail';

export async function TimerProcessEmails(
  timer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('Timer trigger started:', new Date().toISOString());
  
  // Call the email processing function
  await ProcessSupportEmail(null as any, context);
}

app.timer('TimerProcessEmails', {
  schedule: '0 */5 * * * *', // Every 5 minutes
  handler: TimerProcessEmails
});
```

Redeploy:
```powershell
npm run build
func azure functionapp publish <functionAppName>
```

## Part 8: Verify End-to-End

### 8.1 Send Test Email

Send an email to the monitored mailbox (if configured).

Subject: `VPN connection issues`  
Body: `My VPN disconnects every 5 minutes. Can you help?`

### 8.2 Check Processing

```powershell
# View function logs
func azure functionapp logstream <functionAppName>
```

### 8.3 Verify Table Storage Ticket

Check the Azure Storage Account table (`SupportTickets`) for the new ticket:
- PartitionKey: `ticket`
- RowKey: `<timestamp>-<unique-id>`
- Title from email subject
- Description from email body
- Status: New
- Priority/Category from AI classification
- AIResponse from RAG endpoint

## Configuration Reference

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STORAGE_ACCOUNT_NAME` | Azure Storage account name | `stagentsdev123` |
| `STORAGE_ACCOUNT_KEY` | Storage account access key | `<account-key>` |
| `TRIAGE_ENDPOINT` | Triage flow endpoint URL | `https://triage-endpoint.eastus.inference.ml.azure.com/score` |
| `TRIAGE_API_KEY` | Triage flow API key | `<api-key>` |
| `RAG_ENDPOINT` | RAG flow endpoint URL | `https://rag-endpoint.eastus.inference.ml.azure.com/score` |
| `RAG_API_KEY` | RAG flow API key | `<api-key>` |
| `SUPPORT_REPLY_FROM` | Email sender address | `support@yourdomain.com` |

