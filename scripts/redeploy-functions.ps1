# Quick Redeploy - Functions Only
# Use this to redeploy function code changes without re-running full infrastructure deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev"
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Quick Function Redeploy                                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Get function app names
$funcAgents = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-agents')].name" -o tsv | Select-Object -First 1
$funcRag = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-rag')].name" -o tsv | Select-Object -First 1

if (-not $funcAgents -or -not $funcRag) {
    Write-Host "❌ Function apps not found in resource group: $ResourceGroup" -ForegroundColor Red
    exit 1
}

Write-Host "Found function apps:" -ForegroundColor Yellow
Write-Host "  - $funcAgents (main agents)" -ForegroundColor Gray
Write-Host "  - $funcRag (RAG search)" -ForegroundColor Gray

# Deploy RAG function
Write-Host "`n[1/2] Deploying RAG function..." -ForegroundColor Yellow
$ragPath = Join-Path $PSScriptRoot "..\demos\02-rag-search\rag-function"
Push-Location $ragPath

Write-Host "  Installing dependencies..." -ForegroundColor Gray
pip install -r requirements.txt --quiet 2>&1 | Out-Null

Write-Host "  Publishing to Azure..." -ForegroundColor Gray
func azure functionapp publish $funcRag --python

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ RAG function deployed" -ForegroundColor Green
} else {
    Write-Host "❌ RAG function deployment failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Deploy Agents function
Write-Host "`n[2/2] Deploying Agents function..." -ForegroundColor Yellow
$agentsPath = Join-Path $PSScriptRoot "..\demos\04-real-ticket-creation\function"
Push-Location $agentsPath

Write-Host "  Installing dependencies..." -ForegroundColor Gray
npm install --silent 2>&1 | Out-Null

Write-Host "  Building TypeScript..." -ForegroundColor Gray
npm run build 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "  Publishing to Azure..." -ForegroundColor Gray
func azure functionapp publish $funcAgents

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Agents function deployed" -ForegroundColor Green
} else {
    Write-Host "❌ Agents function deployment failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Test endpoints
Write-Host "`n[3/3] Testing endpoints..." -ForegroundColor Yellow

Write-Host "  Waiting for functions to warm up..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host "  Testing /api/triage..." -ForegroundColor Gray
try {
    $triageBody = @{ ticket_text = "My VPN keeps disconnecting" } | ConvertTo-Json
    $triageResult = Invoke-RestMethod -Method POST -Uri "https://$funcAgents.azurewebsites.net/api/triage" -Body $triageBody -ContentType "application/json"
    Write-Host "    ✓ Category: $($triageResult.category), Priority: $($triageResult.priority)" -ForegroundColor Green
} catch {
    Write-Host "    ❌ Failed: $_" -ForegroundColor Red
}

Write-Host "  Testing /api/ticket..." -ForegroundColor Gray
try {
    $ticketBody = @{ description = "Test ticket from deployment"; userEmail = "deploy@test.com" } | ConvertTo-Json
    $ticketResult = Invoke-RestMethod -Method POST -Uri "https://$funcAgents.azurewebsites.net/api/ticket" -Body $ticketBody -ContentType "application/json"
    Write-Host "    ✓ Ticket created: $($ticketResult.ticketId)" -ForegroundColor Green
} catch {
    Write-Host "    ❌ Failed: $_" -ForegroundColor Red
}

Write-Host "  Testing /api/rag-search..." -ForegroundColor Gray
try {
    $ragBody = @{ question = "How do I reset my password?" } | ConvertTo-Json
    $ragResult = Invoke-RestMethod -Method POST -Uri "https://$funcRag.azurewebsites.net/api/rag-search" -Body $ragBody -ContentType "application/json"
    Write-Host "    ✓ Confidence: $($ragResult.confidence)" -ForegroundColor Green
} catch {
    Write-Host "    ❌ Failed: $_" -ForegroundColor Red
}

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Deployment Complete!                                      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Function Endpoints (Anonymous Access):" -ForegroundColor Yellow
Write-Host "  Triage:  https://$funcAgents.azurewebsites.net/api/triage" -ForegroundColor Cyan
Write-Host "  Ticket:  https://$funcAgents.azurewebsites.net/api/ticket" -ForegroundColor Cyan
Write-Host "  RAG:     https://$funcRag.azurewebsites.net/api/rag-search" -ForegroundColor Cyan

Write-Host "`nNext Steps for Demo 08:" -ForegroundColor Yellow
Write-Host "  1. Open Azure AI Foundry VS Code extension" -ForegroundColor Gray
Write-Host "  2. Add 3 OpenAPI tools with 'Anonymous' authentication:" -ForegroundColor Gray
Write-Host "     - triage (use demos/08-foundry-cloud-agent/agent/tools/triage-api.json)" -ForegroundColor Gray
Write-Host "     - ticket (use demos/08-foundry-cloud-agent/agent/tools/ticket-api.json)" -ForegroundColor Gray
Write-Host "     - enterpriseSearch (use demos/08-foundry-cloud-agent/agent/tools/rag-openapi.json)" -ForegroundColor Gray
Write-Host "  3. Add File Search tool (vector store already created)" -ForegroundColor Gray
Write-Host "  4. Test in playground!" -ForegroundColor Gray
