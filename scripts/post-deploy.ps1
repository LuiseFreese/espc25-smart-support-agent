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

$functionPath = Join-Path $PSScriptRoot "..\demos\03-agent-with-tools\function-tool"

if (-not (Test-Path $functionPath)) {
    Write-Host "ERROR: Function code not found at $functionPath" -ForegroundColor Red
    exit 1
}

Push-Location $functionPath

try {
    # Verify critical files exist
    Write-Host "   Verifying function structure..." -ForegroundColor Gray

    $requiredFiles = @(
        "src\index.ts",
        "src\GetOrderStatus\index.ts",
        "src\CreateTicket\index.ts",
        "tsconfig.json",
        "package.json",
        "host.json"
    )

    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            throw "Required file missing: $file"
        }
    }

    # Verify tsconfig.json has correct rootDir
    $tsconfig = Get-Content "tsconfig.json" -Raw | ConvertFrom-Json
    if ($tsconfig.compilerOptions.rootDir -ne "./src") {
        Write-Host "   ⚠ WARNING: tsconfig.json rootDir should be './src' (found: '$($tsconfig.compilerOptions.rootDir)')" -ForegroundColor Yellow
        Write-Host "   This may cause deployment issues. Correct value: `"rootDir`": `"./src`"" -ForegroundColor Yellow
    }

    # Verify package.json has correct main
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.main -ne "dist/index.js") {
        Write-Host "   ⚠ WARNING: package.json main should be 'dist/index.js' (found: '$($packageJson.main)')" -ForegroundColor Yellow
        Write-Host "   This may cause deployment issues. Correct value: `"main`": `"dist/index.js`"" -ForegroundColor Yellow
    }

    Write-Host "   ✓ Function structure validated" -ForegroundColor Green

    # Install dependencies
    Write-Host "   Installing npm dependencies..." -ForegroundColor Gray
    npm install --silent

    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }

    # Build TypeScript
    Write-Host "   Building TypeScript..." -ForegroundColor Gray
    npm run build --silent

    if ($LASTEXITCODE -ne 0) {
        throw "npm build failed"
    }

    # Verify build output
    Write-Host "   Verifying build output..." -ForegroundColor Gray
    $expectedFiles = @(
        "dist\index.js",
        "dist\GetOrderStatus\index.js",
        "dist\CreateTicket\index.js"
    )

    foreach ($file in $expectedFiles) {
        if (-not (Test-Path $file)) {
            throw "Build output missing: $file - check tsconfig.json rootDir setting"
        }
    }

    Write-Host "   ✓ Build output validated (dist/index.js, dist/GetOrderStatus, dist/CreateTicket)" -ForegroundColor Green

    # Deploy to Azure
    Write-Host "   Deploying to Azure ($FunctionAppName)..." -ForegroundColor Gray
    func azure functionapp publish $FunctionAppName --typescript

    if ($LASTEXITCODE -ne 0) {
        throw "Function deployment failed"
    }

    Write-Host "   ✓ Functions deployed successfully" -ForegroundColor Green

    # Wait for deployment to complete
    Write-Host "`n2. Waiting for function app to sync (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30

    # Verify deployment
    Write-Host "`n3. Verifying deployment..." -ForegroundColor Yellow
    $testUrl = "https://$FunctionAppName.azurewebsites.net/api/GetOrderStatus?orderId=12345"

    try {
        $response = Invoke-RestMethod -Uri $testUrl -Method Get -ErrorAction Stop
        Write-Host "   ✓ GetOrderStatus working!" -ForegroundColor Green
        Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ⚠ Function not yet ready (may need more warm-up time)" -ForegroundColor Yellow
        Write-Host "   Test manually: $testUrl" -ForegroundColor Gray
    }

    Write-Host "`n=== POST-DEPLOYMENT COMPLETE ===" -ForegroundColor Green
}
catch {
    Write-Host "`nERROR: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
