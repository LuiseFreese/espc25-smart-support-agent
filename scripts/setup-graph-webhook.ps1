# Setup Microsoft Graph Webhook for Demo 04
# This script automates app registration, permissions, and webhook creation

param(
    [Parameter(Mandatory=$true)]
    [string]$SupportEmail,
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$AppName = "SmartSupportAgent"
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Microsoft Graph Webhook Setup for Demo 04                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Get Function App Name
Write-Host "[Step 1/7] Finding Function App..." -ForegroundColor Yellow
$functionAppName = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-agents')].name" -o tsv | Select-Object -First 1
if (-not $functionAppName) {
    Write-Host "❌ No function app found matching 'func-agents-*' in resource group $ResourceGroup" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Found: $functionAppName" -ForegroundColor Green

# Step 2: Create App Registration
Write-Host "`n[Step 2/7] Creating App Registration..." -ForegroundColor Yellow

# Check for existing apps with the same name and clean up duplicates
$existingApps = az ad app list --display-name $AppName --query "[].appId" -o tsv
$appCount = ($existingApps | Measure-Object).Count

if ($appCount -gt 1) {
    Write-Host "⚠️  Found $appCount app registrations with name '$AppName' - cleaning up duplicates..." -ForegroundColor Yellow
    $appsArray = $existingApps -split "`n"
    # Delete all but the first one
    for ($i = 1; $i -lt $appsArray.Length; $i++) {
        if ($appsArray[$i]) {
            Write-Host "  Deleting duplicate app: $($appsArray[$i])" -ForegroundColor Gray
            az ad app delete --id $appsArray[$i] 2>$null
        }
    }
    $appId = $appsArray[0]
    Write-Host "✓ Using existing app registration: $appId" -ForegroundColor Green
} elseif ($appCount -eq 1) {
    $appId = $existingApps
    Write-Host "✓ Using existing app registration: $appId" -ForegroundColor Green
} else {
    $appId = az ad app create `
        --display-name $AppName `
        --sign-in-audience "AzureADMyOrg" `
        --query "appId" -o tsv
    Write-Host "✓ Created app registration: $appId" -ForegroundColor Green
}

# Add redirect URIs for admin consent (required for AADSTS500113 error prevention)
Write-Host "  Adding redirect URIs for admin consent..." -ForegroundColor Gray
az ad app update --id $appId --web-redirect-uris "https://login.microsoftonline.com/common/oauth2/nativeclient" "http://localhost" "https://portal.azure.com" | Out-Null

# Step 3: Add Microsoft Graph API Permissions
Write-Host "`n[Step 3/7] Adding Microsoft Graph API Permissions..." -ForegroundColor Yellow

# Microsoft Graph API ID
$graphApiId = "00000003-0000-0000-c000-000000000000"

# Permission IDs (Microsoft Graph Application Permissions)
$permissions = @(
    @{ name = "Mail.Read"; id = "810c84a8-4a9e-49e6-bf7d-12d183f40d01" }
    @{ name = "Mail.Send"; id = "e2a3a72e-5f79-4c64-b1b1-878b674786c9" }
)

# Get current permissions
$currentPermissions = az ad app permission list --id $appId --query "[?resourceAppId=='$graphApiId'].resourceAccess[].id" -o tsv

foreach ($perm in $permissions) {
    if ($currentPermissions -contains $perm.id) {
        Write-Host "  $($perm.name) already added - skipping" -ForegroundColor Gray
    } else {
        Write-Host "  Adding $($perm.name)..." -ForegroundColor Gray
        az ad app permission add `
            --id $appId `
            --api $graphApiId `
            --api-permissions "$($perm.id)=Role" | Out-Null
    }
}
Write-Host "✓ Permissions configured" -ForegroundColor Green

# Step 4: Grant Admin Consent
Write-Host "`n[Step 4/7] Granting Admin Consent..." -ForegroundColor Yellow
Write-Host "⚠️  You need Global Administrator privileges for this step" -ForegroundColor Yellow

try {
    az ad app permission admin-consent --id $appId 2>&1 | Out-Null
    Write-Host "✓ Admin consent granted" -ForegroundColor Green
    Write-Host "  Waiting 30 seconds for permissions to propagate..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
} catch {
    Write-Host "⚠️  Automated admin consent failed. Opening browser for manual consent..." -ForegroundColor Yellow
    $tenantId = az account show --query "tenantId" -o tsv
    $consentUrl = "https://login.microsoftonline.com/$tenantId/adminconsent?client_id=$appId&redirect_uri=https://portal.azure.com"
    Write-Host "  Opening: $consentUrl" -ForegroundColor Gray
    Start-Process $consentUrl
    Write-Host "  Please grant admin consent in the browser window, then press Enter to continue..." -ForegroundColor Yellow
    Read-Host
    Write-Host "  Waiting 30 seconds for permissions to propagate..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
}

# Step 5: Create Client Secret
Write-Host "`n[Step 5/7] Creating Client Secret..." -ForegroundColor Yellow
$secretResult = az ad app credential reset --id $appId --query "password" -o tsv
$clientSecret = $secretResult
Write-Host "✓ Client secret created (will be saved to Function App settings)" -ForegroundColor Green

# Step 6: Update Function App Settings
Write-Host "`n[Step 6/7] Updating Function App Settings..." -ForegroundColor Yellow
$tenantId = az account show --query "tenantId" -o tsv

# Get storage account details
$storageAccount = az storage account list --resource-group $ResourceGroup --query "[?contains(name, 'stagents')].name" -o tsv | Select-Object -First 1
if (-not $storageAccount) {
    Write-Host "❌ No storage account found matching 'stagents*' in resource group $ResourceGroup" -ForegroundColor Red
    exit 1
}
Write-Host "  Found storage account: $storageAccount" -ForegroundColor Gray

# Get RAG function app
$ragFunctionApp = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-rag')].name" -o tsv | Select-Object -First 1
if (-not $ragFunctionApp) {
    Write-Host "⚠️  No RAG function app found. RAG_ENDPOINT will not be configured." -ForegroundColor Yellow
    $ragEndpoint = ""
} else {
    $ragEndpoint = "https://$ragFunctionApp.azurewebsites.net/api/rag-search"
    Write-Host "  Found RAG function: $ragFunctionApp" -ForegroundColor Gray
}

# Get Application Insights key
$appInsights = az resource list --resource-group $ResourceGroup --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv
if ($appInsights) {
    $appInsightsKey = az resource show --name $appInsights --resource-group $ResourceGroup --resource-type "Microsoft.Insights/components" --query "properties.InstrumentationKey" -o tsv
    Write-Host "  Found Application Insights: $appInsights" -ForegroundColor Gray
} else {
    Write-Host "⚠️  No Application Insights found. APPINSIGHTS_INSTRUMENTATIONKEY will not be configured." -ForegroundColor Yellow
    $appInsightsKey = ""
}

# Get Communication Services connection string
$commServices = az resource list --resource-group $ResourceGroup --resource-type "Microsoft.Communication/communicationServices" --query "[0].name" -o tsv
if ($commServices) {
    $commConnectionString = az communication list-key --name $commServices --resource-group $ResourceGroup --query "primaryConnectionString" -o tsv
    # Get sender address from deployment outputs (will be set after infrastructure deployment)
    $commSenderAddress = az deployment group show --name communicationServicesDeployment --resource-group $ResourceGroup --query "properties.outputs.senderAddress.value" -o tsv 2>$null
    if (-not $commSenderAddress) {
        # Fallback: construct default Azure-managed domain sender
        $commSenderAddress = "donotreply@[azure-managed-domain]"
    }
    Write-Host "  Found Communication Services: $commServices" -ForegroundColor Gray
} else {
    Write-Host "⚠️  No Communication Services found. Email sending will not work." -ForegroundColor Yellow
    $commConnectionString = ""
    $commSenderAddress = ""
}

# Build settings array
$settings = @(
    "GRAPH_CLIENT_ID=$appId",
    "GRAPH_CLIENT_SECRET=$clientSecret",
    "GRAPH_TENANT_ID=$tenantId",
    "SUPPORT_EMAIL_ADDRESS=$SupportEmail",
    "STORAGE_ACCOUNT_NAME=$storageAccount"
)

if ($ragEndpoint) {
    $settings += "RAG_ENDPOINT=$ragEndpoint"
}

if ($appInsightsKey) {
    $settings += "APPINSIGHTS_INSTRUMENTATIONKEY=$appInsightsKey"
}

if ($commConnectionString) {
    $settings += "COMMUNICATION_SERVICES_CONNECTION_STRING=$commConnectionString"
    $settings += "COMMUNICATION_SERVICES_SENDER_ADDRESS=$commSenderAddress"
}

# Get RAG function key (critical for RAG authentication)
$ragFunctionApp = az functionapp list `
    --resource-group $ResourceGroup `
    --query "[?contains(name, 'func-rag')].name" -o tsv | Select-Object -First 1

$ragApiKey = $null
if ($ragFunctionApp) {
    $ragApiKey = az functionapp keys list `
        --name $ragFunctionApp `
        --resource-group $ResourceGroup `
        --query "functionKeys.default" -o tsv 2>$null
    
    if ($ragApiKey) {
        $settings += "RAG_API_KEY=$ragApiKey"
        Write-Host "  Found RAG function: $ragFunctionApp" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Could not get RAG function key - RAG may return fallback responses" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  RAG function app not found - RAG may return fallback responses" -ForegroundColor Yellow
}

az functionapp config appsettings set `
    --name $functionAppName `
    --resource-group $ResourceGroup `
    --settings $settings | Out-Null

Write-Host "✓ Function app configured with:" -ForegroundColor Green
Write-Host "  - GRAPH_CLIENT_ID: $appId" -ForegroundColor Gray
Write-Host "  - GRAPH_TENANT_ID: $tenantId" -ForegroundColor Gray
Write-Host "  - SUPPORT_EMAIL_ADDRESS: $SupportEmail" -ForegroundColor Gray
Write-Host "  - STORAGE_ACCOUNT_NAME: $storageAccount" -ForegroundColor Gray
if ($ragEndpoint) {
    Write-Host "  - RAG_ENDPOINT: $ragEndpoint" -ForegroundColor Gray
}
if ($ragApiKey) {
    Write-Host "  - RAG_API_KEY: [configured] ⭐" -ForegroundColor Gray
}
if ($appInsightsKey) {
    Write-Host "  - APPINSIGHTS_INSTRUMENTATIONKEY: [configured]" -ForegroundColor Gray
}
if ($commConnectionString) {
    Write-Host "  - COMMUNICATION_SERVICES_CONNECTION_STRING: [configured]" -ForegroundColor Gray
    Write-Host "  - COMMUNICATION_SERVICES_SENDER_ADDRESS: $commSenderAddress" -ForegroundColor Gray
}

# Step 7: Create Webhook Subscription
Write-Host "`n[Step 7/7] Creating Webhook Subscription..." -ForegroundColor Yellow

# Wait for app settings to propagate and permissions to be fully active
Write-Host "  Waiting 30 seconds for app settings and permissions to propagate..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Get function key
$functionKey = az functionapp keys list `
    --name $functionAppName `
    --resource-group $ResourceGroup `
    --query "functionKeys.default" -o tsv

# Create subscription
$subscriptionUrl = "https://$functionAppName.azurewebsites.net/api/managesubscription"
try {
    $result = Invoke-RestMethod -Uri $subscriptionUrl `
        -Method Post `
        -Headers @{ "x-functions-key" = $functionKey } `
        -ContentType "application/json"
    
    Write-Host "✓ Webhook subscription created!" -ForegroundColor Green
    Write-Host "  - Subscription ID: $($result.subscriptionId)" -ForegroundColor Gray
    Write-Host "  - Expires: $($result.expirationDateTime)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Webhook creation failed (admin consent likely not granted yet)" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "`n  Retrying in 30 seconds (permissions may still be propagating)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    try {
        $result = Invoke-RestMethod -Uri $subscriptionUrl `
            -Method Post `
            -Headers @{ "x-functions-key" = $functionKey } `
            -ContentType "application/json"
        
        Write-Host "✓ Webhook subscription created on retry!" -ForegroundColor Green
        Write-Host "  - Subscription ID: $($result.subscriptionId)" -ForegroundColor Gray
        Write-Host "  - Expires: $($result.expirationDateTime)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Webhook subscription requires admin consent first" -ForegroundColor Yellow
        Write-Host "  This is expected - the app registration is configured, but Graph API" -ForegroundColor Gray
        Write-Host "  permissions need to be granted before the webhook can be created." -ForegroundColor Gray
        Write-Host "`n  After granting admin consent (step 10), create the webhook with:" -ForegroundColor Yellow
        Write-Host "  Invoke-RestMethod -Uri `"$subscriptionUrl`" -Method Post -Headers @{ 'x-functions-key' = '$functionKey' }" -ForegroundColor Gray
    }
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Setup Complete!                                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Send a test email to: $SupportEmail" -ForegroundColor White
Write-Host "2. Check webhook processing in Application Insights" -ForegroundColor White
Write-Host "3. Renew subscription every 3 days (automated renewal coming soon)" -ForegroundColor White

Write-Host "`nImportant Notes:" -ForegroundColor Yellow
Write-Host "- Webhook subscriptions expire after 3 days" -ForegroundColor Gray
Write-Host "- To renew: Invoke-RestMethod -Uri `"$subscriptionUrl`" -Method Post -Headers @{ 'x-functions-key' = '$functionKey' }" -ForegroundColor Gray
Write-Host "- Client secret expires in 6 months (rotate before expiry)" -ForegroundColor Gray

Write-Host "`nFor more details, see: docs/WEBHOOK-MANAGEMENT.md`n" -ForegroundColor Gray
