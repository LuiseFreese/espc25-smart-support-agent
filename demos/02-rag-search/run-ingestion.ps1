# Quick script to run KB ingestion with proper environment variables
param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev"
)

Write-Host "Setting up environment variables..." -ForegroundColor Cyan

$searchName = az search service list --resource-group "$ResourceGroup" --query "[0].name" -o tsv
$env:AZURE_AI_SEARCH_ENDPOINT = "https://$searchName.search.windows.net"
$env:AZURE_AI_SEARCH_API_KEY = az search admin-key show --service-name "$searchName" --resource-group "$ResourceGroup" --query "primaryKey" -o tsv

$openaiName = az cognitiveservices account list --resource-group "$ResourceGroup" --query "[?kind=='OpenAI'].name" -o tsv
$env:AZURE_OPENAI_ENDPOINT = "https://$openaiName.openai.azure.com/"
$env:AZURE_OPENAI_API_KEY = az cognitiveservices account keys list --name "$openaiName" --resource-group "$ResourceGroup" --query "key1" -o tsv

$env:AZURE_OPENAI_EMBEDDING_DEPLOYMENT = "text-embedding-3-large"
$env:AZURE_OPENAI_API_VERSION = "2024-08-01-preview"

Write-Host "✓ Environment configured:" -ForegroundColor Green
Write-Host "  Search: $env:AZURE_AI_SEARCH_ENDPOINT" -ForegroundColor Gray
Write-Host "  OpenAI: $env:AZURE_OPENAI_ENDPOINT" -ForegroundColor Gray
Write-Host "  Deployment: $env:AZURE_OPENAI_EMBEDDING_DEPLOYMENT`n" -ForegroundColor Gray

Write-Host "Running ingestion..." -ForegroundColor Cyan
python ingest-kb.py
