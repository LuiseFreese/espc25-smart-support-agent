# Quick Webhook Creation Test
# Tests webhook creation without full deployment
# Usage: .\test-webhook-creation.ps1 -ResourceGroup rg-smart-agents-dev

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Testing Webhook Creation                                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Get function app
$functionApp = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-agents')].name" -o tsv | Select-Object -First 1
if (-not $functionApp) {
    Write-Host "❌ No function app found" -ForegroundColor Red
    exit 1
}
Write-Host "Function App: $functionApp" -ForegroundColor Gray

# Get function key
$functionKey = az functionapp keys list --name $functionApp --resource-group $ResourceGroup --query "functionKeys.default" -o tsv
Write-Host "Function Key: $($functionKey.Substring(0,10))..." -ForegroundColor Gray

# Check current app settings
Write-Host "`nChecking Graph API credentials..." -ForegroundColor Yellow
$settings = az functionapp config appsettings list --name $functionApp --resource-group $ResourceGroup --query "[?name=='GRAPH_CLIENT_ID' || name=='GRAPH_CLIENT_SECRET' || name=='GRAPH_TENANT_ID' || name=='SUPPORT_EMAIL_ADDRESS'].{name:name, value:value}" -o json | ConvertFrom-Json

$clientId = ($settings | Where-Object { $_.name -eq 'GRAPH_CLIENT_ID' }).value
$clientSecret = ($settings | Where-Object { $_.name -eq 'GRAPH_CLIENT_SECRET' }).value
$tenantId = ($settings | Where-Object { $_.name -eq 'GRAPH_TENANT_ID' }).value
$supportEmail = ($settings | Where-Object { $_.name -eq 'SUPPORT_EMAIL_ADDRESS' }).value

Write-Host "  GRAPH_CLIENT_ID: $clientId" -ForegroundColor Gray
Write-Host "  GRAPH_TENANT_ID: $tenantId" -ForegroundColor Gray
Write-Host "  GRAPH_CLIENT_SECRET: $($clientSecret.Substring(0,5))..." -ForegroundColor Gray
Write-Host "  SUPPORT_EMAIL_ADDRESS: $supportEmail" -ForegroundColor Gray

# Test Graph API access directly
Write-Host "`nTesting Graph API access..." -ForegroundColor Yellow
try {
    $body = @{
        client_id = $clientId
        scope = "https://graph.microsoft.com/.default"
        client_secret = $clientSecret
        grant_type = "client_credentials"
    }
    
    $tokenResponse = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Body $body
    Write-Host "✓ Successfully acquired Graph token" -ForegroundColor Green
    
    # Test listing subscriptions
    $headers = @{
        "Authorization" = "Bearer $($tokenResponse.access_token)"
    }
    
    $subscriptions = Invoke-RestMethod -Method Get -Uri "https://graph.microsoft.com/v1.0/subscriptions" -Headers $headers
    Write-Host "✓ Successfully queried Graph API" -ForegroundColor Green
    Write-Host "  Existing subscriptions: $($subscriptions.value.Count)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Graph API test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nThis means the app registration needs admin consent." -ForegroundColor Yellow
    Write-Host "Run this command to grant consent:" -ForegroundColor Yellow
    Write-Host "  Start-Process `"https://login.microsoftonline.com/$tenantId/adminconsent?client_id=$clientId&redirect_uri=https://portal.azure.com`"" -ForegroundColor White
    exit 1
}

# Now test webhook creation via function
Write-Host "`nTesting webhook creation via Azure Function..." -ForegroundColor Yellow
$subscriptionUrl = "https://$functionApp.azurewebsites.net/api/managesubscription"

$attempt = 1
$maxAttempts = 3
$success = $false

while ($attempt -le $maxAttempts -and -not $success) {
    Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    
    try {
        $result = Invoke-RestMethod -Uri $subscriptionUrl `
            -Method Post `
            -Headers @{ "x-functions-key" = $functionKey } `
            -ContentType "application/json"
        
        Write-Host "✓ Webhook subscription created successfully!" -ForegroundColor Green
        Write-Host "  - Subscription ID: $($result.subscriptionId)" -ForegroundColor White
        Write-Host "  - Resource: $($result.resource)" -ForegroundColor Gray
        Write-Host "  - Expires: $($result.expirationDateTime)" -ForegroundColor Gray
        Write-Host "  - Notification URL: $($result.notificationUrl)" -ForegroundColor Gray
        $success = $true
        
    } catch {
        Write-Host "  ❌ Attempt $attempt failed: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "  Waiting 15 seconds before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds 15
        }
    }
    
    $attempt++
}

if (-not $success) {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ❌ Webhook Creation Failed                                ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host "`nPossible causes:" -ForegroundColor Yellow
    Write-Host "1. Admin consent not granted yet (wait 60 seconds after granting)" -ForegroundColor White
    Write-Host "2. App settings not propagated (restart function app)" -ForegroundColor White
    Write-Host "3. Permissions not fully active (wait a few minutes)" -ForegroundColor White
    exit 1
} else {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ Webhook Creation Successful!                           ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
}
