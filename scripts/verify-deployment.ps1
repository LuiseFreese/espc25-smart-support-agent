# Deployment Verification Script
# Checks that all critical configurations are correct

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev"
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Deployment Verification                                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$allGood = $true

# Check 1: Find function apps
Write-Host "[1/6] Checking Function Apps..." -ForegroundColor Yellow
$funcAgents = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-agents')].name" -o tsv | Select-Object -First 1
$funcRag = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-rag')].name" -o tsv | Select-Object -First 1

if ($funcAgents -and $funcRag) {
    Write-Host "✓ Found func-agents: $funcAgents" -ForegroundColor Green
    Write-Host "✓ Found func-rag: $funcRag" -ForegroundColor Green
} else {
    Write-Host "❌ Missing function apps" -ForegroundColor Red
    $allGood = $false
}

# Check 2: Communication Services domain linked
Write-Host "`n[2/6] Checking Communication Services..." -ForegroundColor Yellow
$commServices = az resource list --resource-group $ResourceGroup --resource-type "Microsoft.Communication/communicationServices" --query "[0].name" -o tsv

if ($commServices) {
    $linkedDomains = az communication show --name $commServices --resource-group $ResourceGroup --query "linkedDomains" -o json | ConvertFrom-Json
    
    if ($linkedDomains -and $linkedDomains.Count -gt 0) {
        Write-Host "✓ Communication Services configured: $commServices" -ForegroundColor Green
        Write-Host "✓ Email domain linked" -ForegroundColor Green
    } else {
        Write-Host "❌ Domain not linked! Run: .\post-deploy-communication-services.ps1" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "⚠️  Communication Services not found (optional)" -ForegroundColor Yellow
}

# Check 3: RAG_API_KEY configured
Write-Host "`n[3/6] Checking RAG Authentication..." -ForegroundColor Yellow
$ragApiKey = az functionapp config appsettings list --name $funcAgents --resource-group $ResourceGroup --query "[?name=='RAG_API_KEY'].value" -o tsv

if ($ragApiKey) {
    Write-Host "✓ RAG_API_KEY configured" -ForegroundColor Green
} else {
    Write-Host "❌ RAG_API_KEY missing! RAG will return fallback responses (0.3 confidence)" -ForegroundColor Red
    Write-Host "   Fix: Re-run setup-graph-webhook.ps1" -ForegroundColor Yellow
    $allGood = $false
}

# Check 4: Test RAG endpoint
Write-Host "`n[4/6] Testing RAG Endpoint..." -ForegroundColor Yellow
try {
    $ragKey = az functionapp keys list --name $funcRag --resource-group $ResourceGroup --query "functionKeys.default" -o tsv
    $body = @{ question = "VPN disconnecting" } | ConvertTo-Json
    $ragResponse = Invoke-RestMethod -Uri "https://$funcRag.azurewebsites.net/api/rag-search" -Method Post -Body $body -ContentType "application/json" -Headers @{ 'x-functions-key' = $ragKey } -ErrorAction Stop
    
    if ($ragResponse.confidence -ge 0.7) {
        Write-Host "✓ RAG endpoint working (confidence: $($ragResponse.confidence))" -ForegroundColor Green
    } elseif ($ragResponse.confidence -ge 0.4) {
        Write-Host "⚠️  RAG returning medium confidence ($($ragResponse.confidence))" -ForegroundColor Yellow
        Write-Host "   Consider adding more KB documents" -ForegroundColor Gray
    } else {
        Write-Host "❌ RAG returning low confidence ($($ragResponse.confidence))" -ForegroundColor Red
        Write-Host "   Check knowledge base ingestion" -ForegroundColor Yellow
        $allGood = $false
    }
} catch {
    Write-Host "❌ RAG endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    $allGood = $false
}

# Check 5: Azure AI Search index
Write-Host "`n[5/6] Checking Knowledge Base..." -ForegroundColor Yellow
$searchService = az resource list --resource-group $ResourceGroup --resource-type "Microsoft.Search/searchServices" --query "[0].name" -o tsv

if ($searchService) {
    $searchKey = az search admin-key show --resource-group $ResourceGroup --service-name $searchService --query "primaryKey" -o tsv
    try {
        $indexStats = Invoke-RestMethod -Uri "https://$searchService.search.windows.net/indexes/kb-support/stats?api-version=2023-11-01" -Headers @{ 'api-key' = $searchKey } -ErrorAction Stop
        
        if ($indexStats.documentCount -gt 0) {
            Write-Host "✓ Knowledge base has $($indexStats.documentCount) documents" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Knowledge base is empty - run ingestion script" -ForegroundColor Yellow
            Write-Host "   cd demos\02-rag-search\ingest; npm install; npm run dev" -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️  Could not check index stats" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Azure AI Search not found" -ForegroundColor Red
    $allGood = $false
}

# Check 6: Graph webhook subscription
Write-Host "`n[6/6] Checking Webhook Subscription..." -ForegroundColor Yellow
$graphClientId = az functionapp config appsettings list --name $funcAgents --resource-group $ResourceGroup --query "[?name=='GRAPH_CLIENT_ID'].value" -o tsv

if ($graphClientId) {
    try {
        $funcKey = az functionapp keys list --name $funcAgents --resource-group $ResourceGroup --query "functionKeys.default" -o tsv
        $result = Invoke-RestMethod -Uri "https://$funcAgents.azurewebsites.net/api/managesubscription" -Method Get -Headers @{ 'x-functions-key' = $funcKey } -ErrorAction Stop
        
        if ($result.count -gt 0) {
            $subscription = $result.subscriptions[0]
            $expirationDate = [datetime]::Parse($subscription.expirationDateTime)
            $daysUntilExpiry = ($expirationDate - (Get-Date)).Days
            
            if ($daysUntilExpiry -gt 1) {
                Write-Host "✓ Webhook subscription active (expires in $daysUntilExpiry days)" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Webhook expires soon ($daysUntilExpiry days) - renew with setup-graph-webhook.ps1" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  No webhook subscriptions found" -ForegroundColor Yellow
            Write-Host "   Run: .\setup-graph-webhook.ps1 -ResourceGroup $ResourceGroup -SupportEmail <email>" -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️  Webhook not configured or expired" -ForegroundColor Yellow
        Write-Host "   Run: .\setup-graph-webhook.ps1 -ResourceGroup $ResourceGroup -SupportEmail <email>" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Graph API not configured (optional for Demo 04)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $(if ($allGood) { "Green" } else { "Yellow" })
if ($allGood) {
    Write-Host "║  ✅ All Critical Components Verified!                     ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
    Write-Host "🎉 System is ready to process support emails!" -ForegroundColor Cyan
    Write-Host "`nNext Step: Send a test email to your support address" -ForegroundColor White
} else {
    Write-Host "║  ⚠️  Some Issues Found - Review Above                     ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Yellow
    Write-Host "See DEPLOYMENT-GUIDE.md for troubleshooting steps" -ForegroundColor Gray
}
