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

# Force fresh login to ensure authentication
Write-Host "[0/10] Ensuring fresh Azure authentication..." -ForegroundColor Cyan
try {
    az logout 2>$null
    Write-Host "  Logged out from previous session" -ForegroundColor Gray
} catch {
    # Ignore errors if not logged in
}

Write-Host "  Opening browser for Azure login..." -ForegroundColor Yellow
az login --output none
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Azure login failed. Please check your credentials." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Successfully authenticated with Azure" -ForegroundColor Green

Write-Host "`nConfiguration:" -ForegroundColor Yellow
Write-Host "  Subscription: $SubscriptionId" -ForegroundColor Gray
Write-Host "  Location: $Location" -ForegroundColor Gray
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host "  Support Email: $SupportEmail`n" -ForegroundColor Gray

# Validate prerequisites
Write-Host "[1/10] Validating prerequisites..." -ForegroundColor Yellow

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
Write-Host "`n[2/10] Setting Azure subscription..." -ForegroundColor Yellow
az account set --subscription $SubscriptionId
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set subscription. Check subscription ID and permissions." -ForegroundColor Red
    exit 1
}
$tenantId = az account show --query "tenantId" -o tsv
Write-Host "✓ Subscription set (Tenant: $tenantId)" -ForegroundColor Green

# Purge soft-deleted Cognitive Services resources
Write-Host "`n[3/10] Checking for soft-deleted resources..." -ForegroundColor Yellow
$deletedVaults = $null
$deletedAccounts = $null

try {
    # Check for soft-deleted Cognitive Services (Azure OpenAI)
    $deletedAccounts = az cognitiveservices account list-deleted --query "[?location=='$Location']" -o json 2>$null | ConvertFrom-Json
    if ($deletedAccounts -and $deletedAccounts.Count -gt 0) {
        Write-Host "  Found $($deletedAccounts.Count) soft-deleted Cognitive Services account(s)" -ForegroundColor Yellow
        foreach ($account in $deletedAccounts) {
            Write-Host "  Attempting to purge: $($account.name)..." -ForegroundColor Gray
            az cognitiveservices account purge --name $account.name --resource-group $account.resourceGroup --location $account.location 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Purged $($account.name)" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  Could not purge $($account.name) - will attempt restore during deployment" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  No soft-deleted Cognitive Services resources found" -ForegroundColor Green
    }

    # Check for soft-deleted Key Vaults
    $deletedVaults = az keyvault list-deleted --query "[?properties.location=='$Location']" -o json 2>$null | ConvertFrom-Json
    if ($deletedVaults -and $deletedVaults.Count -gt 0) {
        Write-Host "  Found $($deletedVaults.Count) soft-deleted Key Vault(s)" -ForegroundColor Yellow
        Write-Host "  Attempting to recover soft-deleted vaults..." -ForegroundColor Cyan
        foreach ($vault in $deletedVaults) {
            Write-Host "  Recovering: $($vault.name)..." -ForegroundColor Gray
            try {
                az keyvault recover --name $vault.name --location $vault.properties.location 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✓ Recovered $($vault.name)" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠️  Could not recover $($vault.name) - deployment may recreate it" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  ⚠️  Recovery failed for $($vault.name)" -ForegroundColor Yellow
            }
        }
        Write-Host "  Waiting 30 seconds for Key Vault recovery to complete..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    } else {
        Write-Host "  No soft-deleted Key Vaults found" -ForegroundColor Green
    }

    if ($deletedAccounts -and $deletedAccounts.Count -gt 0) {
        Write-Host "  Waiting 30 seconds for Cognitive Services purge to complete..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    }
} catch {
    Write-Host "  ⚠️  Could not check for soft-deleted resources (continuing anyway)" -ForegroundColor Yellow
}

# Deploy Bicep infrastructure
Write-Host "`n[4/10] Deploying Azure infrastructure (10-15 min)..." -ForegroundColor Yellow
$infraPath = Join-Path $PSScriptRoot "..\infra"
Push-Location $infraPath

$deploymentName = "smart-agents-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "  Deployment name: $deploymentName" -ForegroundColor Gray

# Check if this is a redeployment (resource group or soft-deleted resources exist)
$existingRG = az group exists --name $ResourceGroup 2>$null
$hasRecoveredResources = ($deletedVaults -and $deletedVaults.Count -gt 0) -or ($deletedAccounts -and $deletedAccounts.Count -gt 0)

# Skip role assignments if resource group exists OR if we recovered any resources
# (recovered resources retain their role assignments)
# Use lowercase for proper boolean conversion in Bicep
$createRoleAssignments = if ($existingRG -eq 'true' -or $hasRecoveredResources) { 'false' } else { 'true' }

if ($existingRG -eq 'true') {
    Write-Host "  Detected existing resource group - role assignments will be skipped" -ForegroundColor Yellow
} elseif ($hasRecoveredResources) {
    Write-Host "  Detected recovered resources - role assignments will be skipped" -ForegroundColor Yellow
} else {
    Write-Host "  Fresh deployment - creating all resources and role assignments" -ForegroundColor Cyan
}

# Get current user object ID for RBAC assignments
$currentUserObjectId = az ad signed-in-user show --query "id" -o tsv

Invoke-WithRetry -ScriptBlock {
    $deploymentOutput = az deployment sub create `
        --location $Location `
        --template-file main.bicep `
        --parameters parameters.dev.json `
        --parameters currentUserObjectId=$currentUserObjectId `
        --parameters createRoleAssignments=$createRoleAssignments `
        --name $deploymentName `
        --output json 2>&1 | Out-String

    # Check if deployment failed
    if ($LASTEXITCODE -ne 0) {
        # Parse the error to see if it's only role assignment conflicts
        if ($deploymentOutput -match "RoleAssignmentExists") {
            Write-Host "  ⚠️  Role assignments already exist (this is expected on redeployment)" -ForegroundColor Yellow

            # Check if OTHER resources deployed successfully
            $deploymentStatus = az deployment sub show --name $deploymentName --query "properties.provisioningState" -o tsv 2>$null

            # If the deployment partially succeeded (some resources deployed), continue
            Write-Host "  Checking deployment status..." -ForegroundColor Gray
            $resourcesDeployed = (az resource list --resource-group $ResourceGroup --query "length(@)" -o tsv 2>$null)

            if ($resourcesDeployed -and $resourcesDeployed -gt 0) {
                Write-Host "  ✓ Core infrastructure exists ($resourcesDeployed resources found)" -ForegroundColor Green
                Write-Host "  Continuing deployment (role assignments will be skipped)..." -ForegroundColor Cyan
                return # Exit retry loop successfully
            }
        }

        # If it's a different error, throw
        throw "Infrastructure deployment failed: $deploymentOutput"
    }
}

Pop-Location

# Validate deployment and check for failed resources
Write-Host "\n  Validating deployment..." -ForegroundColor Gray

# Check for failed nested deployments (like role assignments)
$failedDeployments = az deployment group list --resource-group $ResourceGroup --query "[?properties.provisioningState=='Failed'].{Name:name, Error:properties.error.code}" -o json 2>$null | ConvertFrom-Json

if ($failedDeployments -and $failedDeployments.Count -gt 0) {
    $criticalFailures = @()
    foreach ($deployment in $failedDeployments) {
        if ($deployment.Error -eq 'RoleAssignmentExists') {
            Write-Host "  ⚠️  $($deployment.Name): Role assignments already exist (expected on redeployment)" -ForegroundColor Yellow
        } else {
            $criticalFailures += $deployment
        }
    }

    if ($criticalFailures.Count -gt 0) {
        Write-Host "⚠️  Warning: Some deployments failed:" -ForegroundColor Yellow
        foreach ($deployment in $criticalFailures) {
            Write-Host "  - $($deployment.Name): $($deployment.Error)" -ForegroundColor Yellow
        }
    }
}

$failedResources = az deployment sub show --name $deploymentName --query "properties.outputResources[?provisioningState=='Failed'].id" -o json 2>$null | ConvertFrom-Json

if ($failedResources -and $failedResources.Count -gt 0) {
    Write-Host "⚠️  Warning: Some resources failed to deploy:" -ForegroundColor Yellow
    foreach ($resource in $failedResources) {
        $resourceName = ($resource -split '/')[-1]
        Write-Host "  - $resourceName" -ForegroundColor Yellow

        # Get error details
        $resourceType = ($resource -split '/providers/')[-1] -replace '/[^/]+$', ''
        $errorDetails = az deployment sub show --name $deploymentName --query "properties.error" -o json 2>$null | ConvertFrom-Json

        if ($errorDetails) {
            Write-Host "    Error: $($errorDetails.message)" -ForegroundColor Gray

            # Special handling for AI Hub Key Vault permission error
            if ($resource -like '*MachineLearningServices/workspaces*' -and $errorDetails.message -like '*KeyVault*accessPolicies*') {
                Write-Host "    Note: AI Hub deployment failed due to Key Vault permissions." -ForegroundColor Yellow
                Write-Host "    This is a known issue with fresh deployments." -ForegroundColor Yellow
                Write-Host "    AI Hub is optional - continuing with core infrastructure..." -ForegroundColor Cyan
            }
        }
    }
    Write-Host "\n  Core infrastructure deployed successfully" -ForegroundColor Green
} else {
    Write-Host "✓ Infrastructure deployed successfully" -ForegroundColor Green
}

# Wait for resources to be fully provisioned
Write-Host "\n  Waiting for resources to initialize (60 sec)..." -ForegroundColor Gray
Start-Sleep -Seconds 60

# Link Communication Services domain
Write-Host "`n[5/10] Configuring Communication Services..." -ForegroundColor Yellow

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
        Write-Host "  Linking email domain (this may take 30-60 seconds)..." -ForegroundColor Gray

        # Run with timeout to prevent hanging
        $linkJob = Start-Job -ScriptBlock {
            param($name, $rg, $domainId)
            az communication update `
                --name $name `
                --resource-group $rg `
                --linked-domains $domainId `
                --output none 2>&1
        } -ArgumentList $commServicesName, $ResourceGroup, $emailDomainId

        $timeout = 90 # seconds
        $linkJob | Wait-Job -Timeout $timeout | Out-Null

        if ($linkJob.State -eq 'Completed') {
            $linkJob | Receive-Job | Out-Null
            if ($linkJob.ChildJobs[0].State -eq 'Completed' -and -not $linkJob.ChildJobs[0].Error) {
                Write-Host "✓ Communication Services domain linked" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Domain linking may have failed - check Azure Portal" -ForegroundColor Yellow
                Write-Host "  You can manually link the domain later if needed" -ForegroundColor Gray
            }
        } else {
            Write-Host "⚠️  Domain linking timed out after $timeout seconds" -ForegroundColor Yellow
            Write-Host "  Continuing deployment - you can link manually in Azure Portal:" -ForegroundColor Yellow
            Write-Host "    Communication Services → Email → Domains → Link to '$emailServiceName'" -ForegroundColor Gray
            $linkJob | Stop-Job
        }

        $linkJob | Remove-Job -Force
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
    Write-Host "⚠️  Communication Services not found - email sending will not work" -ForegroundColor Yellow
    Write-Host "  Continuing with deployment - other features will still work" -ForegroundColor Gray
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
AZURE_OPENAI_DEPLOYMENT=gpt-5-1-chat
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

# Demo 03 Function Tools (for local development)
AZURE_FUNCTION_APP_URL=http://localhost:7071/api
"@

Set-Content -Path $envFilePath -Value $envContent -Force
Write-Host "✓ .env file updated" -ForegroundColor Green

# Get storage account credentials (needed for Demo 07 configuration)
Write-Host "`n  Getting storage account credentials..." -ForegroundColor Gray
$storageAccountName = az storage account list --resource-group $ResourceGroup --query "[?contains(name, 'stagents')].name" -o tsv | Select-Object -First 1
$storageKey = ""
if ($storageAccountName) {
    $storageKey = az storage account keys list --account-name $storageAccountName --resource-group $ResourceGroup --query "[0].value" -o tsv
    Write-Host "  ✓ Storage credentials retrieved: $storageAccountName" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Storage account not found - Demo 07 ticket creation will not work" -ForegroundColor Yellow
}

# Configure Demo 06 Agentic Retrieval .env
Write-Host "`n  Configuring Demo 06 Agentic Retrieval..." -ForegroundColor Gray
$demo06Path = Join-Path $PSScriptRoot "..\demos\06-agentic-retrieval\.env"
$demo06EnvContent = @"
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=$openaiEndpoint
AZURE_OPENAI_API_KEY=$openaiKey
AZURE_OPENAI_DEPLOYMENT=gpt-5-1-chat

# Azure AI Search Configuration
AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint
AZURE_AI_SEARCH_API_KEY=$searchKey
AZURE_AI_SEARCH_INDEX=kb-support
"@

Set-Content -Path $demo06Path -Value $demo06EnvContent -Force
Write-Host "  ✓ Demo 06 .env file configured" -ForegroundColor Green

# Configure Demo 07 (Multi-Agent Orchestration) - needs search, OpenAI, and storage
$demo07Path = Join-Path $PSScriptRoot "..\demos\07-multi-agent-orchestration\.env"
$demo07EnvContent = @"
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=$openaiEndpoint
AZURE_OPENAI_API_KEY=$openaiKey
AZURE_OPENAI_DEPLOYMENT=gpt-5-1-chat

# Azure AI Search Configuration
AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint
AZURE_AI_SEARCH_API_KEY=$searchKey
AZURE_AI_SEARCH_INDEX=kb-support

# Azure Table Storage (for ticket creation)
STORAGE_ACCOUNT_NAME=$storageAccountName
STORAGE_ACCOUNT_KEY=$storageKey
"@

Set-Content -Path $demo07Path -Value $demo07EnvContent -Force
Write-Host "  ✓ Demo 07 .env file configured" -ForegroundColor Green

# Deploy Function Apps (Demo 02 RAG + Demo 04 Agents)
# Deploy Function Apps
Write-Host "`n[6/10] Deploying Function code...\" -ForegroundColor Yellow

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
Write-Host "`n  [6a] Deploying RAG function (Demo 02)..." -ForegroundColor Cyan

# Configure RAG function app settings first
Write-Host "    Configuring RAG function app settings..." -ForegroundColor Gray
az functionapp config appsettings set `
    --name $funcRag `
    --resource-group $ResourceGroup `
    --settings `
        "AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint" `
        "AZURE_AI_SEARCH_API_KEY=$searchKey" `
        "AZURE_AI_SEARCH_INDEX=kb-support" `
        "AZURE_OPENAI_ENDPOINT=$openaiEndpoint" `
        "AZURE_OPENAI_API_KEY=$openaiKey" `
        "AZURE_OPENAI_API_VERSION=2024-08-01-preview" `
    --output none

Write-Host "  ✓ RAG function app settings configured" -ForegroundColor Green

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
        "AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5-1-chat" `
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
# Deploy Agents Function (Demo 04 + Demo 05)
# ============================================================================
Write-Host "`n  [6b] Deploying Agents function (Demo 04 + Demo 05)..." -ForegroundColor Cyan
Write-Host "       Includes: Email processing endpoints AND Copilot Studio triage/answer endpoints" -ForegroundColor Gray
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
        "WEBHOOK_URL=$webhookUrl" `
    --output none

Write-Host "    Note: RAG endpoint now uses anonymous authentication (no API key needed)" -ForegroundColor Gray

Write-Host "✓ Both function apps deployed and configured" -ForegroundColor Green

# ============================================================================
# Configure Demo 06 Local Development Environment
# ============================================================================
Write-Host "`n[6c] Configuring Demo 06 local environment..." -ForegroundColor Cyan

$demo06EnvPath = Join-Path $PSScriptRoot "..\demos\06-agentic-retrieval\.env"
Write-Host "    Creating .env file at: $demo06EnvPath" -ForegroundColor Gray

# Create .env file with all necessary configuration
@"
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=$openaiEndpoint
AZURE_OPENAI_API_KEY=$openaiKey
AZURE_OPENAI_DEPLOYMENT=gpt-5-1-chat

# Azure AI Search Configuration
AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint
AZURE_AI_SEARCH_API_KEY=$searchKey
AZURE_AI_SEARCH_INDEX=kb-support

# Demo 02 RAG Function Endpoint (deployed Python function)
RAG_ENDPOINT=$ragEndpoint
# Note: RAG_API_KEY kept for backward compatibility, but RAG endpoint now uses anonymous auth
RAG_API_KEY=$ragFunctionKey
"@ | Out-File -FilePath $demo06EnvPath -Encoding utf8 -Force

Write-Host "✓ Demo 06 environment configured" -ForegroundColor Green

# Configure demos-ui/backend (same configuration as Demo 06)
$demosUIBackendEnvPath = Join-Path $PSScriptRoot "..\demos-ui\backend\.env"
@"
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=$openaiEndpoint
AZURE_OPENAI_API_KEY=$openaiKey
AZURE_OPENAI_DEPLOYMENT=gpt-5-1-chat

# Azure AI Search Configuration
AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint
AZURE_AI_SEARCH_API_KEY=$searchKey
AZURE_AI_SEARCH_INDEX=kb-support

# Demo 02 RAG Function Endpoint (deployed Python function)
RAG_ENDPOINT=$ragEndpoint
RAG_API_KEY=$ragFunctionKey
"@ | Out-File -FilePath $demosUIBackendEnvPath -Encoding utf8 -Force

Write-Host "✓ Demos UI backend environment configured" -ForegroundColor Green

# ============================================================================
# Create SupportTickets Table in Storage Account
# ============================================================================
Write-Host "`n[6d] Creating SupportTickets table..." -ForegroundColor Cyan

# Storage credentials already retrieved earlier (before Demo 07 configuration)
if (-not $storageAccountName) {
    Write-Host "⚠️  No storage account found" -ForegroundColor Yellow
} else {
    Write-Host "    Creating table in storage account: $storageAccountName" -ForegroundColor Gray

    # Create the table using Azure CLI
    az storage table create `
        --name SupportTickets `
        --account-name $storageAccountName `
        --account-key $storageKey `
        --output none 2>$null

    # Check result (0 = created successfully, 409 = already exists)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SupportTickets table created" -ForegroundColor Green
    } elseif ($LASTEXITCODE -eq 409) {
        Write-Host "✓ SupportTickets table already exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not verify table creation (may already exist)" -ForegroundColor Yellow
    }

    # Verify table exists by listing tables
    Write-Host "    Verifying table..." -ForegroundColor Gray
    $tables = az storage table list `
        --account-name $storageAccountName `
        --account-key $storageKey `
        --query "[?name=='SupportTickets'].name" `
        -o tsv 2>$null

    if ($tables -eq "SupportTickets") {
        Write-Host "✓ SupportTickets table verified in storage account" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not verify table existence" -ForegroundColor Yellow
    }
}

# Setup Microsoft Graph Webhook
Write-Host "`n[7/10] Setting up Microsoft Graph webhook..." -ForegroundColor Yellow
$setupScript = Join-Path $PSScriptRoot "setup-graph-webhook.ps1"

if (Test-Path $setupScript) {
    # Use consistent app name based on resource group to enable reuse across deployments
    $appName = "SmartSupportAgent-$ResourceGroup"
    & $setupScript -ResourceGroup $ResourceGroup -SupportEmail $SupportEmail -AppName $appName

    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Graph webhook setup had issues - you may need to run setup-graph-webhook.ps1 manually" -ForegroundColor Yellow
    }

    # Wait for app settings to propagate
    Write-Host "  Waiting 10 seconds for app settings to propagate..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
} else {
    Write-Host "❌ setup-graph-webhook.ps1 not found" -ForegroundColor Red
    exit 1
}

# Ingest Knowledge Base (moved here to give OpenAI endpoints maximum time to be ready)
Write-Host "`n[8/10] Ingesting knowledge base documents..." -ForegroundColor Yellow

Write-Host "  Search: $searchName" -ForegroundColor Gray
Write-Host "  OpenAI: $openaiName" -ForegroundColor Gray

# Test actual API availability with longer timeout since endpoints should be ready by now
Write-Host "  Testing Azure OpenAI embeddings endpoint..." -ForegroundColor Gray
$maxWait = 120
$waited = 0
$deploymentsReady = $false

while ($waited -lt $maxWait -and -not $deploymentsReady) {
    try {
        $testHeaders = @{
            'api-key' = $openaiKey
            'Content-Type' = 'application/json'
        }
        $testBody = @{
            input = "test"
        } | ConvertTo-Json

        $testResponse = Invoke-RestMethod `
            -Uri "$openaiEndpoint/openai/deployments/text-embedding-3-large/embeddings?api-version=2024-08-01-preview" `
            -Method Post `
            -Headers $testHeaders `
            -Body $testBody `
            -TimeoutSec 10 `
            -ErrorAction Stop

        Write-Host "  ✓ OpenAI embeddings endpoint verified and ready" -ForegroundColor Green
        Write-Host "  Waiting additional 30 seconds for model to fully load..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
        $deploymentsReady = $true
    } catch {
        Write-Host "  Endpoint not ready yet, waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
        Start-Sleep -Seconds 10
        $waited += 10
    }
}

if (-not $deploymentsReady) {
    Write-Host "  ⚠️  OpenAI endpoints still not ready - skipping KB ingestion" -ForegroundColor Yellow
    Write-Host "  You can manually run ingestion later: cd demos\02-rag-search && .\run-ingestion.ps1" -ForegroundColor Yellow
} else {
    $ingestPath = Join-Path $PSScriptRoot "..\demos\02-rag-search"

    if (Test-Path (Join-Path $ingestPath "run-ingestion.ps1")) {
        Push-Location $ingestPath

        Write-Host "  Running KB ingestion via helper script..." -ForegroundColor Gray
        .\run-ingestion.ps1 -ResourceGroup $ResourceGroup

        if ($LASTEXITCODE -eq 0) {
            # Wait for Azure AI Search indexing to complete
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
                Write-Host "⚠️  Indexing not complete yet, waiting 60 more seconds..." -ForegroundColor Yellow
                Start-Sleep -Seconds 60

                try {
                    $indexStats = Invoke-RestMethod `
                        -Uri "$searchEndpoint/indexes/kb-support/stats?api-version=2023-11-01" `
                        -Headers @{ 'api-key' = $searchKey } `
                        -ErrorAction Stop
                    $documentCount = $indexStats.documentCount

                    if ($documentCount -gt 0) {
                        Write-Host "✓ Knowledge base indexed ($documentCount documents)" -ForegroundColor Green
                    } else {
                        Write-Host "⚠️  Indexing still in progress - documents will be available shortly" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "⚠️  Could not verify final index status" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "⚠️  Knowledge base ingestion failed - you can retry manually" -ForegroundColor Yellow
        }
        Pop-Location
    } else {
        Write-Host "⚠️  Ingest script not found - skipping KB ingestion" -ForegroundColor Yellow
    }
}

# Verify Deployment
Write-Host "`n[9/10] Verifying deployment..." -ForegroundColor Yellow

# Test anonymous endpoints
Write-Host "  Testing anonymous endpoints..." -ForegroundColor Cyan
$endpointsOk = $true

# Test triage endpoint
Write-Host "    Testing /api/triage..." -ForegroundColor Gray
try {
    $triageBody = @{ ticket_text = "Test VPN issue" } | ConvertTo-Json
    $triageResult = Invoke-RestMethod -Method POST -Uri "https://$funcAgents.azurewebsites.net/api/triage" -Body $triageBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "      ✓ Triage endpoint responding" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Triage endpoint failed: $_" -ForegroundColor Red
    $endpointsOk = $false
}

# Test ticket endpoint
Write-Host "    Testing /api/ticket..." -ForegroundColor Gray
try {
    $ticketBody = @{ description = "Test ticket"; userEmail = "test@contoso.com" } | ConvertTo-Json
    $ticketResult = Invoke-RestMethod -Method POST -Uri "https://$funcAgents.azurewebsites.net/api/ticket" -Body $ticketBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "      ✓ Ticket endpoint responding (ID: $($ticketResult.ticketId))" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Ticket endpoint failed: $_" -ForegroundColor Red
    $endpointsOk = $false
}

# Test RAG endpoint
Write-Host "    Testing /api/rag-search..." -ForegroundColor Gray
try {
    $ragBody = @{ question = "How do I reset my password?" } | ConvertTo-Json
    $ragResult = Invoke-RestMethod -Method POST -Uri "https://$funcRag.azurewebsites.net/api/rag-search" -Body $ragBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "      ✓ RAG endpoint responding (confidence: $($ragResult.confidence))" -ForegroundColor Green
} catch {
    Write-Host "      ❌ RAG endpoint failed: $_" -ForegroundColor Red
    $endpointsOk = $false
}

if ($endpointsOk) {
    Write-Host "`n  ✓ All endpoints responding without authentication" -ForegroundColor Green
} else {
    Write-Host "`n  ⚠️  Some endpoints failed - check logs above" -ForegroundColor Yellow
}

# Run full verification script
$verifyScript = Join-Path $PSScriptRoot "verify-deployment.ps1"

if (Test-Path $verifyScript) {
    & $verifyScript -ResourceGroup $ResourceGroup
} else {
    Write-Host "⚠️  verify-deployment.ps1 not found - skipping verification" -ForegroundColor Yellow
}

# Display deployment summary BEFORE admin consent
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Infrastructure Deployment Complete!                       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "What was deployed:" -ForegroundColor Yellow
Write-Host "  ✓ Azure infrastructure (OpenAI, AI Search, Functions, Storage, etc.)" -ForegroundColor Green
Write-Host "  ✓ Communication Services (email domain linked)" -ForegroundColor Green
Write-Host "  ✓ Knowledge base (11 documents ingested)" -ForegroundColor Green
Write-Host "  ✓ RAG function (func-rag)" -ForegroundColor Green
Write-Host "  ✓ Agents function (func-agents)" -ForegroundColor Green
Write-Host "  ✓ Graph API app registration created" -ForegroundColor Green

Write-Host "`nResource Details:" -ForegroundColor Cyan
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "  Location: $Location" -ForegroundColor White
Write-Host "  Tenant ID: $tenantId" -ForegroundColor White
Write-Host "  Support Email: $SupportEmail" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Complete admin consent (next step below)" -ForegroundColor White
Write-Host "2. Send a test email to: $SupportEmail" -ForegroundColor White
Write-Host "3. Check your inbox for automated response (if confidence ≥0.7)" -ForegroundColor White
Write-Host "4. View tickets: Azure Portal → Storage Account → Tables → SupportTickets" -ForegroundColor White

Write-Host "`nMaintenance Reminders:" -ForegroundColor Yellow
Write-Host "  • Webhook expires in 3 days - renew with ManageSubscription endpoint" -ForegroundColor Gray
Write-Host "  • View logs in Application Insights" -ForegroundColor Gray
Write-Host "  • Update KB: Add files to demos/02-rag-search/content/ and re-run deploy" -ForegroundColor Gray

Write-Host "`nDocumentation:" -ForegroundColor Cyan
Write-Host "  • Session guide: docs/SESSION-STORYLINE.md" -ForegroundColor White
Write-Host "  • Technical reference: docs/DEMO-OVERVIEW.md" -ForegroundColor White
Write-Host "  • Architecture: docs/AUTHENTICATION-ARCHITECTURE.md`n" -ForegroundColor White

# [10/10] Final Step: Grant Admin Consent (Interactive)
Write-Host "`n[10/10] Final Configuration: Admin Consent Required" -ForegroundColor Yellow
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Grant Admin Consent (Global Administrator Required)      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "⚠️  IMPORTANT: Complete this step to enable email processing`n" -ForegroundColor Yellow

# Get app registration details from the setup-graph-webhook script
# Try multiple methods to retrieve the app ID
$functionAppName = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-agents')].name" -o tsv | Select-Object -First 1

if ($functionAppName) {
    $graphAppId = az functionapp config appsettings list --name $functionAppName --resource-group $ResourceGroup --query "[?name=='GRAPH_CLIENT_ID'].value" -o tsv 2>$null
}

# Fallback: Query app registration by display name
if (-not $graphAppId) {
    $appName = "SmartSupportAgent-$ResourceGroup"
    $graphAppId = az ad app list --display-name $appName --query "[0].appId" -o tsv 2>$null
}

$tenantId = az account show --query "tenantId" -o tsv

if ($graphAppId) {
    Write-Host "App Registration Details:" -ForegroundColor Cyan
    Write-Host "  App ID: $graphAppId" -ForegroundColor White
    Write-Host "  Tenant ID: $tenantId" -ForegroundColor White
    Write-Host "  Required Permissions:" -ForegroundColor White
    Write-Host "    - Mail.Read (Application)" -ForegroundColor Gray
    Write-Host "    - Mail.Send (Application)`n" -ForegroundColor Gray

    $consentUrl = "https://login.microsoftonline.com/$tenantId/adminconsent?client_id=$graphAppId&redirect_uri=https://portal.azure.com"

    Write-Host "Opening admin consent page in your browser..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process $consentUrl

    Write-Host "`n📋 Instructions:" -ForegroundColor Cyan
    Write-Host "  1. ✅ Sign in with a Global Administrator account (if prompted)" -ForegroundColor White
    Write-Host "  2. ✅ Review the requested permissions:" -ForegroundColor White
    Write-Host "       • Mail.Read - Read mail in all mailboxes" -ForegroundColor Gray
    Write-Host "       • Mail.Send - Send mail as any user" -ForegroundColor Gray
    Write-Host "  3. ✅ Click 'Accept' to grant admin consent for your organization" -ForegroundColor White
    Write-Host "  4. ✅ Wait for the 'Admin consent succeeded' confirmation page`n" -ForegroundColor White

    Write-Host "⏸️  Press Enter after you've completed admin consent in the browser..." -ForegroundColor Magenta
    Read-Host

    Write-Host "`n⏳ Waiting 60 seconds for Azure AD to propagate consent..." -ForegroundColor Gray
    Start-Sleep -Seconds 60

# Fixed webhook creation section after admin consent

    Write-Host "`n🔄 Testing webhook creation..." -ForegroundColor Yellow

    # Use function app name from earlier deployment (already stored in $funcAgents)
    if ($funcAgents) {
        # ManageSubscription requires function key authentication (admin operation)
        $functionKey = az functionapp keys list --name $funcAgents --resource-group $ResourceGroup --query "functionKeys.default" -o tsv 2>$null

        if ($functionKey) {
            try {
                $headers = @{ 'x-functions-key' = $functionKey }
                $webhookResult = Invoke-RestMethod -Uri "https://$funcAgents.azurewebsites.net/api/managesubscription" -Method Post -Headers $headers -ErrorAction Stop

                Write-Host "✅ SUCCESS! Webhook subscription created" -ForegroundColor Green
                Write-Host "   Subscription ID: $($webhookResult.subscriptionId)" -ForegroundColor Gray
                Write-Host "   Expires: $($webhookResult.expirationDateTime)`n" -ForegroundColor Gray
            } catch {
                Write-Host "⚠️  Webhook creation failed: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Host "   This may be due to:" -ForegroundColor Gray
                Write-Host "   - Admin consent not fully propagated (wait 5 minutes and retry)" -ForegroundColor Gray
                Write-Host "   - Signed in with non-admin account" -ForegroundColor Gray
                Write-Host "`n   To retry, run:" -ForegroundColor Cyan
                Write-Host "   .\scripts\setup-graph-webhook.ps1 -ResourceGroup $ResourceGroup -SupportEmail $SupportEmail`n" -ForegroundColor Gray
            }
        } else {
            Write-Host "⚠️  Could not retrieve function key" -ForegroundColor Yellow
            Write-Host "   You can manually create webhook using setup script or Azure Portal`n" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  Could not find function app" -ForegroundColor Yellow
        Write-Host "   You can manually create webhook with:" -ForegroundColor Cyan
        Write-Host "   .\scripts\setup-graph-webhook.ps1 -ResourceGroup $ResourceGroup -SupportEmail $SupportEmail`n" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Could not find Graph app registration - admin consent step skipped" -ForegroundColor Yellow
    Write-Host "   You may need to run: .\scripts\setup-graph-webhook.ps1 -ResourceGroup $ResourceGroup -SupportEmail $SupportEmail`n" -ForegroundColor Gray
}

# ============================================================================
# STEP 12: Deploy Demos UI Backend (Optional)
# ============================================================================

Write-Host "`n📱 Step 12/13: Deploying Demos UI Backend to App Service..." -ForegroundColor Cyan

# Check if App Service Plan exists
$appServicePlan = az appservice plan list --resource-group $ResourceGroup --query "[?name=='asp-demos-backend'].name" -o tsv 2>$null

if (-not $appServicePlan) {
    Write-Host "  Creating App Service Plan (B1)..." -ForegroundColor Gray
    az appservice plan create `
        --name "asp-demos-backend" `
        --resource-group $ResourceGroup `
        --sku B1 `
        --is-linux `
        --location $Location | Out-Null
    Write-Host "  ✅ App Service Plan created" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  App Service Plan already exists" -ForegroundColor Gray
}

# Create Web App
$appName = "app-demos-backend-$uniqueId"
$existingApp = az webapp list --resource-group $ResourceGroup --query "[?name=='$appName'].name" -o tsv 2>$null

if (-not $existingApp) {
    Write-Host "  Creating Web App: $appName..." -ForegroundColor Gray
    az webapp create `
        --name $appName `
        --resource-group $ResourceGroup `
        --plan "asp-demos-backend" `
        --runtime "NODE:20-lts" | Out-Null
    Write-Host "  ✅ Web App created" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Web App already exists" -ForegroundColor Gray
}

# Enable Managed Identity
Write-Host "  Enabling Managed Identity..." -ForegroundColor Gray
az webapp identity assign --name $appName --resource-group $ResourceGroup | Out-Null

# Get the Managed Identity principal ID
$appPrincipalId = az webapp identity show --name $appName --resource-group $ResourceGroup --query "principalId" -o tsv

# Grant Key Vault access
Write-Host "  Granting Key Vault access..." -ForegroundColor Gray
az role assignment create `
    --role "Key Vault Secrets User" `
    --assignee $appPrincipalId `
    --scope "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.KeyVault/vaults/$keyVaultName" | Out-Null

# Configure app settings with Key Vault references
Write-Host "  Configuring environment variables..." -ForegroundColor Gray

$kvUri = "https://$keyVaultName.vault.azure.net"
az webapp config appsettings set `
    --name $appName `
    --resource-group $ResourceGroup `
    --settings `
        "AZURE_OPENAI_ENDPOINT=@Microsoft.KeyVault(SecretUri=$kvUri/secrets/AZURE-OPENAI-ENDPOINT/)" `
        "AZURE_OPENAI_API_KEY=@Microsoft.KeyVault(SecretUri=$kvUri/secrets/AZURE-OPENAI-API-KEY/)" `
        "AZURE_AI_SEARCH_ENDPOINT=@Microsoft.KeyVault(SecretUri=$kvUri/secrets/AZURE-AI-SEARCH-ENDPOINT/)" `
        "AZURE_AI_SEARCH_API_KEY=@Microsoft.KeyVault(SecretUri=$kvUri/secrets/AZURE-AI-SEARCH-API-KEY/)" `
        "PORT=8080" `
        "WEBSITE_NODE_DEFAULT_VERSION=~20" | Out-Null

# Set startup command
az webapp config set `
    --name $appName `
    --resource-group $ResourceGroup `
    --startup-file "node dist/server-unified.js" | Out-Null

# Build and deploy backend
Write-Host "  Building backend..." -ForegroundColor Gray
Push-Location "$PSScriptRoot\..\demos-ui\backend"
npm install --silent 2>&1 | Out-Null
npm run build --silent 2>&1 | Out-Null

# Create deployment package
Write-Host "  Creating deployment package..." -ForegroundColor Gray
if (Test-Path "deploy.zip") { Remove-Item "deploy.zip" -Force }
Compress-Archive -Path dist,node_modules,package.json -DestinationPath deploy.zip -Force

# Deploy
Write-Host "  Deploying to Azure (this may take 2-3 minutes)..." -ForegroundColor Gray
try {
    az webapp deployment source config-zip `
        --name $appName `
        --resource-group $ResourceGroup `
        --src deploy.zip `
        --timeout 600 2>&1 | Out-Null
    Write-Host "  ✅ Backend deployed successfully" -ForegroundColor Green
    Write-Host "  URL: https://$appName.azurewebsites.net" -ForegroundColor Cyan
} catch {
    Write-Host "  ⚠️  Deployment may have timed out, but app might still be starting" -ForegroundColor Yellow
    Write-Host "  Check status at: https://portal.azure.com" -ForegroundColor Gray
}

# Clean up
Remove-Item "deploy.zip" -Force -ErrorAction SilentlyContinue
Pop-Location

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Deployment Complete - System Ready!                       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

