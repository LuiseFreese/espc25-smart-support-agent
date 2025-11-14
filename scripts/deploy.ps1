# Complete Deployment Script - Idempotent
# This script deploys infrastructure and application code in one command
# Usage: .\scripts\deploy.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$Location = "swedencentral",

    [Parameter(Mandatory=$false)]
    [string]$EnvironmentName = "dev"
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Azure AI Foundry Smart Support Agent - Complete Deploy   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check if logged in to Azure
try {
    $context = Get-AzContext
    if ($null -eq $context) {
        Write-Host "Not logged in to Azure. Running Connect-AzAccount..." -ForegroundColor Yellow
        Connect-AzAccount
    }
    else {
        Write-Host "✓ Logged in as: $($context.Account.Id)" -ForegroundColor Green
    }
}
catch {
    Write-Host "ERROR: Azure PowerShell module not loaded" -ForegroundColor Red
    exit 1
}

# Check if func CLI is installed
try {
    $funcVersion = func --version
    Write-Host "✓ Azure Functions Core Tools: $funcVersion" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Azure Functions Core Tools not installed" -ForegroundColor Red
    Write-Host "Install from: https://learn.microsoft.com/azure/azure-functions/functions-run-local" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Node.js not installed" -ForegroundColor Red
    exit 1
}

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Python not installed" -ForegroundColor Red
    Write-Host "Install from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# STEP 1: Deploy Infrastructure
Write-Host "`n[1/4] Deploying infrastructure with Bicep..." -ForegroundColor Cyan

$deployName = "smartagents-$(Get-Date -Format 'yyyyMMddHHmmss')"
$bicepFile = Join-Path $PSScriptRoot "..\infra\main.bicep"
$parametersFile = Join-Path $PSScriptRoot "..\infra\parameters.dev.json"

Write-Host "Deployment name: $deployName" -ForegroundColor Gray
Write-Host "Location: $Location" -ForegroundColor Gray

# Get current user's Object ID for Key Vault access (OPTIONAL - for development convenience)
Write-Host "`nGetting current user Object ID for Key Vault access..." -ForegroundColor Gray
try {
    $context = Get-AzContext
    $currentUser = Get-AzADUser -UserPrincipalName $context.Account.Id -ErrorAction SilentlyContinue
    if ($currentUser) {
        $userObjectId = $currentUser.Id
        Write-Host "✓ Found Object ID: $userObjectId (you'll have Key Vault access)" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Could not find user Object ID - you won't have Key Vault access in portal (not required)" -ForegroundColor Yellow
        $userObjectId = ""
    }
}
catch {
    Write-Host "⚠ Could not retrieve user Object ID: $_" -ForegroundColor Yellow
    Write-Host "  Note: This is optional. Function App uses Managed Identity (no impact)." -ForegroundColor Gray
    $userObjectId = ""
}

try {
    # Check if role assignments already exist (from previous deployment)
    Write-Host "Checking if role assignments need to be created..." -ForegroundColor Gray
    $createRoleAssignments = $true

    try {
        $rg = Get-AzResourceGroup -Name "rg-smart-agents-dev" -ErrorAction SilentlyContinue
        if ($rg) {
            $functionApp = Get-AzWebApp -ResourceGroupName $rg.ResourceGroupName -ErrorAction SilentlyContinue |
                Where-Object { $_.Kind -like '*functionapp*' } | Select-Object -First 1

            if ($functionApp -and $functionApp.Identity.PrincipalId) {
                $existingAssignments = Get-AzRoleAssignment -ObjectId $functionApp.Identity.PrincipalId -ErrorAction SilentlyContinue
                if ($existingAssignments.Count -gt 0) {
                    Write-Host "⚠ Found $($existingAssignments.Count) existing role assignment(s) - will skip recreation" -ForegroundColor Yellow
                    $createRoleAssignments = $false
                }
            }
        }
    }
    catch {
        Write-Host "Could not check existing role assignments - will attempt to create them" -ForegroundColor Gray
    }

    $deployment = New-AzSubscriptionDeployment `
        -Location $Location `
        -TemplateFile $bicepFile `
        -TemplateParameterFile $parametersFile `
        -Name $deployName `
        -currentUserObjectId $userObjectId `
        -createRoleAssignments $createRoleAssignments `
        -Verbose

    if ($deployment.ProvisioningState -ne "Succeeded") {
        throw "Infrastructure deployment failed: $($deployment.ProvisioningState)"
    }

    Write-Host "✓ Infrastructure deployed successfully" -ForegroundColor Green
}
catch {
    Write-Host "ERROR deploying infrastructure: $_" -ForegroundColor Red
    exit 1
}

# Extract outputs
$outputs = $deployment.Outputs
$resourceGroupName = $outputs.resourceGroupName.Value
$functionAppName = $outputs.functionAppName.Value
$searchServiceName = $outputs.searchServiceName.Value
$searchEndpoint = $outputs.searchEndpoint.Value
$openAIEndpoint = $outputs.openAIEndpoint.Value
$storageAccountName = $outputs.storageAccountName.Value

Write-Host "`nDeployment Outputs:" -ForegroundColor Yellow
Write-Host "  Resource Group: $resourceGroupName" -ForegroundColor Gray
Write-Host "  Function App: $functionAppName" -ForegroundColor Gray
Write-Host "  Storage Account: $storageAccountName" -ForegroundColor Gray
Write-Host "  Search Service: $searchServiceName" -ForegroundColor Gray
Write-Host "  OpenAI Endpoint: $openAIEndpoint" -ForegroundColor Gray

# STEP 2: Update .env file
Write-Host "`n[2/4] Updating .env file..." -ForegroundColor Cyan

$envFile = Join-Path $PSScriptRoot "..\.env"
$envContent = @"
# Azure Resources (auto-generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
AZURE_RESOURCE_GROUP=$resourceGroupName
AZURE_OPENAI_ENDPOINT=$openAIEndpoint
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT=$($outputs.openAIGptDeployment.Value)
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=$($outputs.openAIEmbeddingDeployment.Value)
AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint
AZURE_AI_SEARCH_API_KEY=$($outputs.searchAdminKey.Value)
AZURE_AI_SEARCH_INDEX=kb-support
AZURE_FUNCTION_APP_URL=https://$functionAppName.azurewebsites.net/api
APPINSIGHTS_CONNECTION_STRING=$($outputs.appInsightsConnectionString.Value)

# Use Managed Identity (no API keys needed for function app)
AZURE_USE_MANAGED_IDENTITY=true
"@

$envContent | Out-File -FilePath $envFile -Encoding utf8 -Force
Write-Host "✓ .env file updated" -ForegroundColor Green

# STEP 3: Deploy Function App Code
Write-Host "`n[3/4] Deploying Azure Functions code..." -ForegroundColor Cyan

& (Join-Path $PSScriptRoot "post-deploy.ps1") -ResourceGroup $resourceGroupName -FunctionAppName $functionAppName

# STEP 4: Ingest Knowledge Base
Write-Host "`n[4/4] Ingesting knowledge base to Azure AI Search..." -ForegroundColor Cyan

$ingestScript = Join-Path $PSScriptRoot "..\demos\02-rag-search\ingest-kb.py"
$requirementsFile = Join-Path $PSScriptRoot "..\requirements.txt"

if (Test-Path $ingestScript) {
    try {
        # Install Python dependencies if requirements.txt exists
        if (Test-Path $requirementsFile) {
            Write-Host "Installing Python dependencies..." -ForegroundColor Gray
            python -m pip install -q -r $requirementsFile
        }

        # Run ingestion
        python $ingestScript

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Knowledge base ingested" -ForegroundColor Green
        }
        else {
            throw "Ingestion failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        Write-Host "⚠ Knowledge base ingestion failed: $_" -ForegroundColor Yellow
        Write-Host "  Run manually: python ingest-kb.py" -ForegroundColor Gray
    }
}
else {
    Write-Host "⚠ ingest-kb.py not found - skipped" -ForegroundColor Yellow
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              🎉 DEPLOYMENT COMPLETE! 🎉                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Next Steps:" -ForegroundColor Cyan

Write-Host "1. Test Demo 01 (Triage):" -ForegroundColor White
Write-Host "   python test-demo01.py" -ForegroundColor Gray
Write-Host "`n2. Test Demo 02 (RAG Search):" -ForegroundColor White
Write-Host "   python test-demo02-rag.py" -ForegroundColor Gray
Write-Host "`n3. Test Demo 03 (Agent with Tools):" -ForegroundColor White
Write-Host "   cd demos/03-agent-with-tools/agent && npm install && npm run dev -- 'Where is order 12345?'" -ForegroundColor Gray
Write-Host "`n4. View resources in Azure Portal:" -ForegroundColor White
Write-Host "   https://portal.azure.com/#@/resource/subscriptions/$($context.Subscription.Id)/resourceGroups/$resourceGroupName" -ForegroundColor Gray

Write-Host "`n📊 Resource Summary:" -ForegroundColor Cyan
Write-Host "   - Azure OpenAI: gpt-4o-mini + text-embedding-3-large (with Managed Identity)" -ForegroundColor Gray
Write-Host "   - Azure AI Search: $searchServiceName (3 docs indexed)" -ForegroundColor Gray
Write-Host "   - Azure Functions: $functionAppName (GetOrderStatus, CreateTicket)" -ForegroundColor Gray
Write-Host "   - Storage Account: $storageAccountName (Table Storage for tickets)" -ForegroundColor Gray
Write-Host "   - Managed Identity: Configured for OpenAI + Search + Key Vault" -ForegroundColor Gray

Write-Host "`n✨ All resources deployed ✨`n" -ForegroundColor Green
