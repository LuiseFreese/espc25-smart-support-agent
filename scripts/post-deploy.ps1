# Post-Deployment Script
# This script runs after Bicep deployment to deploy function code
# Usage: .\scripts\post-deploy.ps1 -ResourceGroup "rg-smart-agents-dev"

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev",

    [Parameter(Mandatory=$false)]
    [string]$FunctionAppName = ""
)

Write-Host "`n=== POST-DEPLOYMENT TASKS ===" -ForegroundColor Cyan

# Get Function App name if not provided
if ([string]::IsNullOrEmpty($FunctionAppName)) {
    $funcApps = Get-AzFunctionApp -ResourceGroupName $ResourceGroup
    if ($funcApps.Count -eq 0) {
        Write-Host "ERROR: No Function App found in resource group $ResourceGroup" -ForegroundColor Red
        exit 1
    }
    $FunctionAppName = $funcApps[0].Name
    Write-Host "Found Function App: $FunctionAppName" -ForegroundColor Green
}

Write-Host "`n1. Deploying Azure Functions code..." -ForegroundColor Yellow

# Deploy Demo 03 - Agent with Tools
$demo03Path = Join-Path $PSScriptRoot "..\demos\03-agent-with-tools\function-tool"

if (Test-Path $demo03Path) {
    Write-Host "   [Demo 03] Deploying Agent with Tools..." -ForegroundColor Cyan
    Push-Location $demo03Path

    try {
        npm install --silent
        npm run build --silent
        func azure functionapp publish $FunctionAppName --typescript

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Demo 03 deployed successfully" -ForegroundColor Green
        }
        else {
            Write-Host "   ⚠ Demo 03 deployment had issues" -ForegroundColor Yellow
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "   ⚠ Demo 03 not found, skipping..." -ForegroundColor Yellow
}

# Deploy Demo 04b - Email to Storage
$demo04bPath = Join-Path $PSScriptRoot "..\demos\04b-real-ticket-creation\function"

if (Test-Path $demo04bPath) {
    Write-Host "   [Demo 04b] Deploying Email-to-Storage..." -ForegroundColor Cyan
    Push-Location $demo04bPath

    try {
        npm install --silent
        npm run build --silent
        func azure functionapp publish $FunctionAppName

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Demo 04b deployed successfully" -ForegroundColor Green
        }
        else {
            Write-Host "   ⚠ Demo 04b deployment had issues" -ForegroundColor Yellow
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "   ⚠ Demo 04b not found, skipping..." -ForegroundColor Yellow
}

# Wait for deployment to complete
Write-Host "`n2. Waiting for function app to sync (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Verify deployment
Write-Host "`n3. Verifying deployment..." -ForegroundColor Yellow

Write-Host "`n4. Testing deployed endpoints..." -ForegroundColor Yellow

# Test Demo 03 endpoints if deployed
if (Test-Path (Join-Path $PSScriptRoot "..\demos\03-agent-with-tools\function-tool")) {
    $getOrderUrl = "https://$FunctionAppName.azurewebsites.net/api/GetOrderStatus?orderId=12345"

    try {
        Write-Host "   [Demo 03] Testing GetOrderStatus..." -ForegroundColor Cyan
        $getOrderResponse = Invoke-RestMethod -Uri $getOrderUrl -Method Get -ErrorAction Stop
        Write-Host "   ✓ GetOrderStatus working: $($getOrderResponse.status)" -ForegroundColor Green
    }
    catch {
        Write-Host "   ⚠ GetOrderStatus test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Test Demo 04b endpoints if deployed
if (Test-Path (Join-Path $PSScriptRoot "..\demos\04b-real-ticket-creation\function")) {
    $pingStorageUrl = "https://$FunctionAppName.azurewebsites.net/api/pingstorage"

    try {
        Write-Host "   [Demo 04b] Testing PingStorage..." -ForegroundColor Cyan
        $pingResponse = Invoke-RestMethod -Uri $pingStorageUrl -Method Get -ErrorAction Stop
        Write-Host "   ✓ PingStorage working: $($pingResponse.message)" -ForegroundColor Green
        Write-Host "     Created ticket: $($pingResponse.rowKey)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ⚠ PingStorage test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== POST-DEPLOYMENT COMPLETE ===" -ForegroundColor Green
