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
$functionApps = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-agents')].name" -o tsv
if ($functionApps.Count -eq 0) {
    Write-Host "❌ No function app found matching 'func-agents-*' in resource group $ResourceGroup" -ForegroundColor Red
    exit 1
}
$functionAppName = $functionApps[0]
Write-Host "✓ Found: $functionAppName" -ForegroundColor Green

# Step 2: Create App Registration
Write-Host "`n[Step 2/7] Creating App Registration..." -ForegroundColor Yellow
$existingApp = az ad app list --display-name $AppName --query "[0].appId" -o tsv
if ($existingApp) {
    Write-Host "⚠️  App registration '$AppName' already exists (ID: $existingApp)" -ForegroundColor Yellow
    $appId = $existingApp
} else {
    $appId = az ad app create `
        --display-name $AppName `
        --sign-in-audience "AzureADMyOrg" `
        --query "appId" -o tsv
    Write-Host "✓ Created app registration: $appId" -ForegroundColor Green
}

# Step 3: Add Microsoft Graph API Permissions
Write-Host "`n[Step 3/7] Adding Microsoft Graph API Permissions..." -ForegroundColor Yellow

# Microsoft Graph API ID
$graphApiId = "00000003-0000-0000-c000-000000000000"

# Permission IDs
$permissions = @(
    @{ name = "Mail.Read"; id = "810c84a8-4a9e-49e6-bf7d-12d183f40d01" }
    @{ name = "Mail.Send"; id = "b633e1c5-b582-4048-a93e-9f11b44c7e96" }
    @{ name = "User.Read.All"; id = "df021288-bdef-4463-88db-98f22de89214" }
)

foreach ($perm in $permissions) {
    Write-Host "  Adding $($perm.name)..." -ForegroundColor Gray
    az ad app permission add `
        --id $appId `
        --api $graphApiId `
        --api-permissions "$($perm.id)=Role" | Out-Null
}
Write-Host "✓ Permissions added" -ForegroundColor Green

# Step 4: Grant Admin Consent
Write-Host "`n[Step 4/7] Granting Admin Consent..." -ForegroundColor Yellow
Write-Host "⚠️  You need Global Administrator privileges for this step" -ForegroundColor Yellow
az ad app permission admin-consent --id $appId
Write-Host "✓ Admin consent granted" -ForegroundColor Green

# Step 5: Create Client Secret
Write-Host "`n[Step 5/7] Creating Client Secret..." -ForegroundColor Yellow
$secretResult = az ad app credential reset --id $appId --query "password" -o tsv
$clientSecret = $secretResult
Write-Host "✓ Client secret created (will be saved to Function App settings)" -ForegroundColor Green

# Step 6: Update Function App Settings
Write-Host "`n[Step 6/7] Updating Function App Settings..." -ForegroundColor Yellow
$tenantId = az account show --query "tenantId" -o tsv

az webapp config appsettings set `
    --name $functionAppName `
    --resource-group $ResourceGroup `
    --settings `
        "GRAPH_CLIENT_ID=$appId" `
        "GRAPH_CLIENT_SECRET=$clientSecret" `
        "GRAPH_TENANT_ID=$tenantId" `
        "SUPPORT_EMAIL_ADDRESS=$SupportEmail" | Out-Null

Write-Host "✓ Function app configured with:" -ForegroundColor Green
Write-Host "  - GRAPH_CLIENT_ID: $appId" -ForegroundColor Gray
Write-Host "  - GRAPH_TENANT_ID: $tenantId" -ForegroundColor Gray
Write-Host "  - SUPPORT_EMAIL_ADDRESS: $SupportEmail" -ForegroundColor Gray

# Step 7: Create Webhook Subscription
Write-Host "`n[Step 7/7] Creating Webhook Subscription..." -ForegroundColor Yellow

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
    Write-Host "⚠️  Could not create webhook subscription automatically" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  You can create it manually later with:" -ForegroundColor Yellow
    Write-Host "  Invoke-RestMethod -Uri `"$subscriptionUrl`" -Method Post -Headers @{ 'x-functions-key' = '$functionKey' }" -ForegroundColor Gray
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
