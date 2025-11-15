# Setup Environment Variables
# This script gathers all Azure resource keys and creates a .env file
# Run this after deploying infrastructure with Bicep

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev"
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Environment Setup - Gathering Azure Resource Keys        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Find Resources
Write-Host "[Step 1/5] Finding Azure resources in '$ResourceGroup'..." -ForegroundColor Yellow

$searchName = az search service list --resource-group $ResourceGroup --query "[0].name" -o tsv
$openaiName = az cognitiveservices account list --resource-group $ResourceGroup --query "[?kind=='OpenAI'].name" -o tsv
$ragFunction = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-rag')].name" -o tsv
$agentsFunction = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-agents')].name" -o tsv

if (-not $searchName -or -not $openaiName -or -not $ragFunction -or -not $agentsFunction) {
    Write-Host "❌ Could not find all required resources!" -ForegroundColor Red
    Write-Host "   Make sure you've deployed infrastructure first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Found resources:" -ForegroundColor Green
Write-Host "  - AI Search: $searchName" -ForegroundColor Gray
Write-Host "  - OpenAI: $openaiName" -ForegroundColor Gray
Write-Host "  - RAG Function: $ragFunction" -ForegroundColor Gray
Write-Host "  - Agents Function: $agentsFunction" -ForegroundColor Gray

# Step 2: Get API Keys
Write-Host "`n[Step 2/5] Retrieving API keys..." -ForegroundColor Yellow

$searchKey = az search admin-key show --service-name $searchName --resource-group $ResourceGroup --query "primaryKey" -o tsv
$openaiKey = az cognitiveservices account keys list --name $openaiName --resource-group $ResourceGroup --query "key1" -o tsv
Write-Host "✓ Retrieved AI Search and OpenAI keys" -ForegroundColor Green

# Step 3: Get Function Keys
Write-Host "`n[Step 3/5] Retrieving function keys..." -ForegroundColor Yellow

$ragKey = az functionapp keys list --name $ragFunction --resource-group $ResourceGroup --query "functionKeys.default" -o tsv
$agentsKey = az functionapp keys list --name $agentsFunction --resource-group $ResourceGroup --query "functionKeys.default" -o tsv
Write-Host "✓ Retrieved function keys" -ForegroundColor Green

# Step 4: Get Account Info
Write-Host "`n[Step 4/5] Getting account information..." -ForegroundColor Yellow

$tenantId = az account show --query "tenantId" -o tsv
$subscriptionId = az account show --query "id" -o tsv
Write-Host "✓ Retrieved tenant and subscription IDs" -ForegroundColor Green

# Step 5: Create .env File
Write-Host "`n[Step 5/5] Creating .env file..." -ForegroundColor Yellow

$envContent = @"
# Azure Resources Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Run 'scripts/setup-env.ps1' to regenerate

# Azure AI Search
AZURE_AI_SEARCH_ENDPOINT=https://$searchName.search.windows.net
AZURE_AI_SEARCH_API_KEY=$searchKey

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://$openaiName.openai.azure.com/
AZURE_OPENAI_API_KEY=$openaiKey

# Function Apps
RAG_FUNCTION_URL=https://$ragFunction.azurewebsites.net
RAG_FUNCTION_KEY=$ragKey
AGENTS_FUNCTION_URL=https://$agentsFunction.azurewebsites.net
AGENTS_FUNCTION_KEY=$agentsKey

# Microsoft Graph (for Demo 04 - configure with setup-graph-webhook.ps1)
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=
GRAPH_TENANT_ID=$tenantId
SUPPORT_EMAIL_ADDRESS=

# Azure Resources
RESOURCE_GROUP=$ResourceGroup
TENANT_ID=$tenantId
SUBSCRIPTION_ID=$subscriptionId
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✓ .env file created successfully!" -ForegroundColor Green

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Setup Complete!                                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Configuration saved to: .env" -ForegroundColor Cyan
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Test RAG function: .\tests\test-demo02-rag.ps1" -ForegroundColor White
Write-Host "2. (Optional) Configure Graph webhook: .\scripts\setup-graph-webhook.ps1 -SupportEmail 'support@yourdomain.com'" -ForegroundColor White
Write-Host "3. Ingest knowledge base: python demos/02-rag-search/ingest-kb.py" -ForegroundColor White

Write-Host "`n⚠️  Important:" -ForegroundColor Yellow
Write-Host "- .env file contains secrets and is excluded from git" -ForegroundColor Gray
Write-Host "- Re-run this script if you redeploy infrastructure" -ForegroundColor Gray
Write-Host "- For production, use Azure Key Vault instead of .env" -ForegroundColor Gray
