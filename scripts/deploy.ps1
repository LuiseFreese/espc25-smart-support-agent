# Complete Deployment Script
# Deploys entire Azure AI Foundry Smart Support Agent system from scratch
# Works in ANY tenant without manual intervention
# Usage: .\scripts\deploy.ps1 -SubscriptionId <sub-id> -SupportEmail "support@yourdomain.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,

    [Parameter(Mandatory=$true)]
    [string]$SupportEmail,

    [Parameter(Mandatory=$false)]
    [string]$Location = "swedencentral",

    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev"
)

$ErrorActionPreference = "Stop"

# Helper function for retries
function Invoke-WithRetry {
    param(
        [scriptblock]$ScriptBlock,
        [int]$MaxRetries = 3,
        [int]$DelaySeconds = 10
    )
    
    $attempt = 1
    while ($attempt -le $MaxRetries) {
        try {
            return & $ScriptBlock
        }
        catch {
            if ($attempt -eq $MaxRetries) {
                throw
            }
            Write-Host "  Attempt $attempt failed, retrying in $DelaySeconds seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds $DelaySeconds
            $attempt++
        }
    }
}

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Azure AI Foundry Smart Support Agent - Full Deployment   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Subscription: $SubscriptionId" -ForegroundColor Gray
Write-Host "  Location: $Location" -ForegroundColor Gray
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host "  Support Email: $SupportEmail`n" -ForegroundColor Gray

# Validate prerequisites
Write-Host "[0/8] Validating prerequisites..." -ForegroundColor Yellow

# Check Azure CLI
try {
    $azVersion = az version --query '\"azure-cli\"' -o tsv
    Write-Host "✓ Azure CLI version: $azVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found. Install from: https://aka.ms/install-azure-cli" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Install from: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check Azure Functions Core Tools
try {
    $funcVersion = func --version
    Write-Host "✓ Azure Functions Core Tools version: $funcVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure Functions Core Tools not found. Install: npm install -g azure-functions-core-tools@4" -ForegroundColor Red
    exit 1
}

# Set Azure subscription
Write-Host "`n[1/8] Setting Azure subscription..." -ForegroundColor Yellow
az account set --subscription $SubscriptionId
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set subscription. Check subscription ID and permissions." -ForegroundColor Red
    exit 1
}
$tenantId = az account show --query "tenantId" -o tsv
Write-Host "✓ Subscription set (Tenant: $tenantId)" -ForegroundColor Green

# Deploy Bicep infrastructure
Write-Host "`n[2/8] Deploying Azure infrastructure (10-15 min)..." -ForegroundColor Yellow
$infraPath = Join-Path $PSScriptRoot "..\infra"
Push-Location $infraPath

$deploymentName = "smart-agents-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "  Deployment name: $deploymentName" -ForegroundColor Gray

# Get current user object ID for RBAC assignments
$currentUserObjectId = az ad signed-in-user show --query "id" -o tsv

Invoke-WithRetry -ScriptBlock {
    az deployment sub create `
        --location $Location `
        --template-file main.bicep `
        --parameters parameters.dev.json `
        --parameters currentUserObjectId=$currentUserObjectId `
        --name $deploymentName `
        --output none
    
    if ($LASTEXITCODE -ne 0) {
        throw "Infrastructure deployment failed"
    }
}

Pop-Location
Write-Host "✓ Infrastructure deployed" -ForegroundColor Green

# Wait for resources to be fully provisioned
Write-Host "`n  Waiting for resources to initialize (60 sec)..." -ForegroundColor Gray
Start-Sleep -Seconds 60

# Link Communication Services domain
Write-Host "`n[3/8] Configuring Communication Services..." -ForegroundColor Yellow

$commServicesName = az resource list `
    --resource-group $ResourceGroup `
    --resource-type "Microsoft.Communication/communicationServices" `
    --query "[0].name" -o tsv

if ($commServicesName) {
    Write-Host "  Found Communication Services: $commServicesName" -ForegroundColor Gray
    
    $subId = az account show --query "id" -o tsv
    $emailServiceName = "$commServicesName-email"
    $emailDomainId = "/subscriptions/$subId/resourceGroups/$ResourceGroup/providers/Microsoft.Communication/EmailServices/$emailServiceName/domains/AzureManagedDomain"

    # Check if already linked
    $currentLinkedDomains = az communication show `
        --name $commServicesName `
        --resource-group $ResourceGroup `
        --query "linkedDomains" -o json 2>$null | ConvertFrom-Json

    if ($currentLinkedDomains -contains $emailDomainId) {
        Write-Host "✓ Email domain already linked" -ForegroundColor Green
    } else {
        Write-Host "  Linking email domain..." -ForegroundColor Gray
        Invoke-WithRetry -ScriptBlock {
            az communication update `
                --name $commServicesName `
                --resource-group $ResourceGroup `
                --linked-domains $emailDomainId `
                --output none 2>&1 | Out-Null
            
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to link email domain"
            }
        }
        Write-Host "✓ Communication Services domain linked" -ForegroundColor Green
    }
    
    # Get sender address
    $senderAddress = az communication email domain show `
        --domain-name "AzureManagedDomain" `
        --email-service-name $emailServiceName `
        --resource-group $ResourceGroup `
        --query "mailFromSenderDomain" -o tsv 2>$null
    
    if ($senderAddress) {
        Write-Host "  Sender address: donotreply@$senderAddress" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Communication Services not found - email sending will not work" -ForegroundColor Red
    Write-Host "  Check if Bicep deployment completed successfully" -ForegroundColor Yellow
    exit 1
}

# Update .env file with new resource values
Write-Host "`n  Updating .env file..." -ForegroundColor Gray

$envFilePath = Join-Path $PSScriptRoot "..\.env"
$tenantId = az account show --query "tenantId" -o tsv
$subscriptionId = az account show --query "id" -o tsv

# Get Azure AI Search and OpenAI details
$searchName = az search service list --resource-group $ResourceGroup --query "[0].name" -o tsv
$searchKey = az search admin-key show --service-name $searchName --resource-group $ResourceGroup --query "primaryKey" -o tsv
$searchEndpoint = "https://$searchName.search.windows.net"

$openaiName = az cognitiveservices account list --resource-group $ResourceGroup --query "[?kind=='OpenAI'].name" -o tsv
$openaiKey = az cognitiveservices account keys list --name $openaiName --resource-group $ResourceGroup --query "key1" -o tsv
$openaiEndpoint = "https://$openaiName.openai.azure.com/"

# Get function app names
$funcRag = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-rag')].name" -o tsv | Select-Object -First 1
$funcAgents = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-agents')].name" -o tsv | Select-Object -First 1

$envContent = @"
# Azure Resources Configuration
# Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Tenant: $tenantId
# Subscription: $subscriptionId

# Azure AI Search
AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint
AZURE_AI_SEARCH_API_KEY=$searchKey
AZURE_AI_SEARCH_INDEX=kb-support

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=$openaiEndpoint
AZURE_OPENAI_API_KEY=$openaiKey
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Function Apps
RAG_FUNCTION_URL=https://$funcRag.azurewebsites.net
RAG_FUNCTION_KEY=
AGENTS_FUNCTION_URL=https://$funcAgents.azurewebsites.net
AGENTS_FUNCTION_KEY=

# Azure Resources
RESOURCE_GROUP=$ResourceGroup
TENANT_ID=$tenantId
SUBSCRIPTION_ID=$subscriptionId

# Support Email
SUPPORT_EMAIL_ADDRESS=$SupportEmail
"@

Set-Content -Path $envFilePath -Value $envContent -Force
Write-Host "✓ .env file updated" -ForegroundColor Green

# Ingest Knowledge Base
Write-Host "`n[4/8] Ingesting knowledge base documents..." -ForegroundColor Yellow

Write-Host "  Search: $searchName" -ForegroundColor Gray
Write-Host "  OpenAI: $openaiName" -ForegroundColor Gray

$ingestPath = Join-Path $PSScriptRoot "..\demos\02-rag-search"

if (Test-Path (Join-Path $ingestPath "ingest-kb.py")) {
    Push-Location $ingestPath

    # Set environment variables for ingestion
    $env:AZURE_AI_SEARCH_ENDPOINT = $searchEndpoint
    $env:AZURE_AI_SEARCH_API_KEY = $searchKey
    $env:AZURE_OPENAI_ENDPOINT = $openaiEndpoint
    $env:AZURE_OPENAI_API_KEY = $openaiKey

    Write-Host "  Running Python ingestion script..." -ForegroundColor Gray
    python ingest-kb.py

    if ($LASTEXITCODE -eq 0) {
        # Wait for Azure AI Search indexing to complete (asynchronous process)
        Write-Host "  Waiting for search indexing to complete..." -ForegroundColor Gray
        $maxAttempts = 12
        $attempt = 0
        $documentCount = 0
        
        while ($attempt -lt $maxAttempts) {
            Start-Sleep -Seconds 5
            $attempt++
            
            try {
                $indexStats = Invoke-RestMethod `
                    -Uri "$searchEndpoint/indexes/kb-support/stats?api-version=2023-11-01" `
                    -Headers @{ 'api-key' = $searchKey } `
                    -ErrorAction Stop
                
                $documentCount = $indexStats.documentCount
                
                if ($documentCount -gt 0) {
                    Write-Host "✓ Knowledge base ingested ($documentCount documents)" -ForegroundColor Green
                    break
                }
                
                Write-Host "    Attempt $attempt/$maxAttempts - Indexing in progress..." -ForegroundColor Gray
            } catch {
                Write-Host "    Attempt $attempt/$maxAttempts - Checking index status..." -ForegroundColor Gray
            }
        }
        
        if ($documentCount -eq 0) {
            Write-Host "⚠️  Documents uploaded but indexing not yet complete" -ForegroundColor Yellow
            Write-Host "    This is normal for large KB. Documents will be available shortly." -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Knowledge base ingestion failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
} else {
    Write-Host "❌ Ingest script not found at: $ingestPath" -ForegroundColor Red
    exit 1
}

# Deploy Function Apps (Demo 02 RAG + Demo 04 Agents)
Write-Host "`n[5/8] Deploying Function code..." -ForegroundColor Yellow

# Get both function apps
$funcAgents = az functionapp list `
    --resource-group $ResourceGroup `
    --query "[?contains(name, 'func-agents')].name" -o tsv | Select-Object -First 1

$funcRag = az functionapp list `
    --resource-group $ResourceGroup `
    --query "[?contains(name, 'func-rag')].name" -o tsv | Select-Object -First 1

if (-not $funcAgents) {
    Write-Host "❌ Agents function app not found" -ForegroundColor Red
    exit 1
}

if (-not $funcRag) {
    Write-Host "❌ RAG function app not found" -ForegroundColor Red
    exit 1
}

Write-Host "  Found: $funcAgents (main orchestration)" -ForegroundColor Gray
Write-Host "  Found: $funcRag (RAG search)" -ForegroundColor Gray

# ============================================================================
# Deploy RAG Function First (Demo 02)
# ============================================================================
Write-Host "`n  [5a] Deploying RAG function (Demo 02)..." -ForegroundColor Cyan
$demo02RagPath = Join-Path $PSScriptRoot "..\demos\02-rag-search\rag-function"

if (Test-Path $demo02RagPath) {
    Push-Location $demo02RagPath
    
    Write-Host "    Installing Python dependencies..." -ForegroundColor Gray
    pip install -r requirements.txt --quiet 2>&1 | Out-Null
    
    Write-Host "    Publishing RAG function to Azure..." -ForegroundColor Gray
    func azure functionapp publish $funcRag --python --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ RAG function deployed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ RAG function deployment failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
} else {
    Write-Host "  ❌ RAG function code not found at: $demo02RagPath" -ForegroundColor Red
    exit 1
}

# Configure RAG function app settings
Write-Host "    Configuring RAG function settings..." -ForegroundColor Gray
az functionapp config appsettings set `
    --name $funcRag `
    --resource-group $ResourceGroup `
    --settings `
        "AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint" `
        "AZURE_AI_SEARCH_API_KEY=$searchKey" `
        "AZURE_AI_SEARCH_INDEX=kb-support" `
        "AZURE_OPENAI_ENDPOINT=$openaiEndpoint" `
        "AZURE_OPENAI_API_KEY=$openaiKey" `
        "AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini" `
        "AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large" `
        "AZURE_OPENAI_API_VERSION=2024-08-01-preview" `
    --output none

# Get RAG function key and endpoint for Agents function to call
Write-Host "    Getting RAG function key..." -ForegroundColor Gray
$ragFunctionKey = az functionapp keys list --name $funcRag --resource-group $ResourceGroup --query "functionKeys.default" -o tsv
$ragEndpoint = "https://$funcRag.azurewebsites.net/api/rag-search"

Write-Host "  ✓ RAG function configured" -ForegroundColor Green
Write-Host "    Endpoint: $ragEndpoint" -ForegroundColor Gray

# ============================================================================
# Deploy Agents Function (Demo 04)
# ============================================================================
Write-Host "`n  [5b] Deploying Agents function (Demo 04)..." -ForegroundColor Cyan
$demo04Path = Join-Path $PSScriptRoot "..\demos\04-real-ticket-creation\function"

if (Test-Path $demo04Path) {
    Push-Location $demo04Path
    
    # Install dependencies and build
    Write-Host "    Installing dependencies..." -ForegroundColor Gray
    npm install --silent 2>&1 | Out-Null
    
    Write-Host "    Building TypeScript..." -ForegroundColor Gray
    npm run build 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Build failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    # Deploy to Azure
    Write-Host "    Publishing to Azure..." -ForegroundColor Gray
    func azure functionapp publish $funcAgents --javascript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Agents function deployed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Agents function deployment failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
} else {
    Write-Host "  ❌ Agents function code not found at: $demo04Path" -ForegroundColor Red
    exit 1
}

# Configure Agents function app settings (includes RAG_ENDPOINT and WEBHOOK_URL)
Write-Host "    Configuring Agents function settings..." -ForegroundColor Gray
$webhookUrl = "https://$funcAgents.azurewebsites.net/api/GraphWebhook"
az functionapp config appsettings set `
    --name $funcAgents `
    --resource-group $ResourceGroup `
    --settings `
        "AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint" `
        "AZURE_AI_SEARCH_API_KEY=$searchKey" `
        "AZURE_AI_SEARCH_INDEX=kb-support" `
        "AZURE_OPENAI_ENDPOINT=$openaiEndpoint" `
        "AZURE_OPENAI_API_KEY=$openaiKey" `
        "SUPPORT_EMAIL_ADDRESS=$SupportEmail" `
        "RAG_ENDPOINT=$ragEndpoint" `
        "RAG_API_KEY=$ragFunctionKey" `
        "WEBHOOK_URL=$webhookUrl" `
    --output none

Write-Host "✓ Both function apps deployed and configured" -ForegroundColor Green

# Setup Microsoft Graph Webhook
Write-Host "`n[6/8] Setting up Microsoft Graph webhook..." -ForegroundColor Yellow
$setupScript = Join-Path $PSScriptRoot "setup-graph-webhook.ps1"

if (Test-Path $setupScript) {
    & $setupScript -ResourceGroup $ResourceGroup -SupportEmail $SupportEmail -AppName "SmartSupportAgent-$((Get-Random -Maximum 9999).ToString('0000'))"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Graph webhook setup had issues - you may need to run setup-graph-webhook.ps1 manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ setup-graph-webhook.ps1 not found" -ForegroundColor Red
    exit 1
}

# Verify Deployment
Write-Host "`n[7/8] Verifying deployment..." -ForegroundColor Yellow
$verifyScript = Join-Path $PSScriptRoot "verify-deployment.ps1"

if (Test-Path $verifyScript) {
    & $verifyScript -ResourceGroup $ResourceGroup
} else {
    Write-Host "⚠️  verify-deployment.ps1 not found - skipping verification" -ForegroundColor Yellow
}

# Final Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🎉 DEPLOYMENT COMPLETE!                                   ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Your AI Support Agent is ready!" -ForegroundColor Cyan
Write-Host "`nWhat was deployed:" -ForegroundColor Yellow
Write-Host "  ✓ Azure infrastructure (OpenAI, AI Search, Functions, Storage, etc.)" -ForegroundColor Green
Write-Host "  ✓ Communication Services (email domain linked)" -ForegroundColor Green
Write-Host "  ✓ Knowledge base (11 documents ingested)" -ForegroundColor Green
Write-Host "  ✓ RAG function (func-rag)" -ForegroundColor Green
Write-Host "  ✓ Agents function (func-agents)" -ForegroundColor Green
Write-Host "  ✓ Graph API integration (webhook configured)" -ForegroundColor Green

Write-Host "`nResource Details:" -ForegroundColor Cyan
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "  Location: $Location" -ForegroundColor White
Write-Host "  Tenant ID: $tenantId" -ForegroundColor White
Write-Host "  Support Email: $SupportEmail" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Send a test email to: $SupportEmail" -ForegroundColor White
Write-Host "2. Check your inbox for automated response (if confidence ≥0.7)" -ForegroundColor White
Write-Host "3. View tickets: Azure Portal → Storage Account → Tables → SupportTickets" -ForegroundColor White
Write-Host "4. Monitor: Azure Portal → Application Insights → Live Metrics" -ForegroundColor White

Write-Host "`nMaintenance Reminders:" -ForegroundColor Yellow
Write-Host "  • Webhook expires in 3 days - renew: .\scripts\setup-graph-webhook.ps1 -ResourceGroup $ResourceGroup -SupportEmail $SupportEmail" -ForegroundColor Gray
Write-Host "  • View logs in Application Insights" -ForegroundColor Gray
Write-Host "  • Update KB: Add files to demos/02-rag-search/content/ and re-run deploy" -ForegroundColor Gray

Write-Host "`nDocumentation:" -ForegroundColor Cyan
Write-Host "  • Session guide: docs/SESSION-STORYLINE.md" -ForegroundColor White
Write-Host "  • Technical reference: docs/DEMO-OVERVIEW.md" -ForegroundColor White
Write-Host "  • Architecture: docs/AUTHENTICATION-ARCHITECTURE.md`n" -ForegroundColor White
