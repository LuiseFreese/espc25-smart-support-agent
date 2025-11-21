# Deploy Demos UI Frontend to Azure Static Web Apps (Frontend Only)
# Backend stays local or can be deployed separately to App Service
# Usage: .\scripts\deploy-demos-ui.ps1 -ResourceGroup "rg-smart-agents-dev"

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev",

    [Parameter(Mandatory=$false)]
    [string]$Location = "swedencentral",

    [Parameter(Mandatory=$false)]
    [string]$AppName = "swa-smart-agents-demos"
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Deploy Demos UI to Azure Static Web Apps              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check if SWA CLI is installed
try {
    $swaVersion = swa --version 2>$null
    Write-Host "✓ SWA CLI installed: $swaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ SWA CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @azure/static-web-apps-cli
    Write-Host "✓ SWA CLI installed" -ForegroundColor Green
}

Write-Host "`n[2/5] Building frontend..." -ForegroundColor Yellow
Push-Location demos-ui/frontend
npm install
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Frontend built successfully" -ForegroundColor Green
Pop-Location

Write-Host "`n[3/5] Skipping backend build (frontend-only deployment)..." -ForegroundColor Yellow
Write-Host "✓ Backend will run locally or be deployed separately" -ForegroundColor Green

Write-Host "`n[4/5] Creating Azure Static Web App..." -ForegroundColor Yellow

# Check if Static Web App already exists
$existingApp = az staticwebapp show --name $AppName --resource-group $ResourceGroup 2>$null

if ($existingApp) {
    Write-Host "✓ Static Web App '$AppName' already exists" -ForegroundColor Green
} else {
    Write-Host "Creating new Static Web App..." -ForegroundColor Gray
    az staticwebapp create `
        --name $AppName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Free `
        --output-location "dist"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create Static Web App" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Static Web App created" -ForegroundColor Green
}

Write-Host "`n[5/5] Getting deployment token..." -ForegroundColor Yellow
$deploymentToken = az staticwebapp secrets list --name $AppName --resource-group $ResourceGroup --query "properties.apiKey" -o tsv

if (-not $deploymentToken) {
    Write-Host "❌ Failed to get deployment token" -ForegroundColor Red
    exit 1
}

Write-Host "`n[6/6] Deploying to Azure Static Web Apps..." -ForegroundColor Yellow
Push-Location demos-ui

swa deploy `
    --app-location "./frontend" `
    --output-location "dist" `
    --deployment-token $deploymentToken `
    --no-use-keychain

Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    
    $appUrl = az staticwebapp show --name $AppName --resource-group $ResourceGroup --query "defaultHostname" -o tsv
    Write-Host "`n🌐 Your app is live at: https://$appUrl" -ForegroundColor Cyan
    Write-Host "`nNote: It may take a few minutes for changes to propagate." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Deployment failed" -ForegroundColor Red
    exit 1
}
