# Configure RAG Function App Settings
# Quick script to set up environment variables for the RAG function

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-smart-agents-dev"
)

Write-Host "Configuring RAG Function App Settings..." -ForegroundColor Cyan

# Get resource names
$funcRag = az functionapp list --resource-group $ResourceGroup --query "[?contains(name, 'func-rag')].name" -o tsv | Select-Object -First 1
$searchService = az search service list --resource-group $ResourceGroup --query "[0].name" -o tsv
$openaiAccount = az cognitiveservices account list --resource-group $ResourceGroup --query "[?kind=='OpenAI'].name" -o tsv | Select-Object -First 1

Write-Host "  RAG Function: $funcRag" -ForegroundColor Gray
Write-Host "  Search Service: $searchService" -ForegroundColor Gray
Write-Host "  OpenAI Account: $openaiAccount" -ForegroundColor Gray

# Get endpoints and keys
Write-Host "`nRetrieving credentials..." -ForegroundColor Yellow
$searchEndpoint = "https://$searchService.search.windows.net"
$searchKey = az search admin-key show --service-name $searchService --resource-group $ResourceGroup --query 'primaryKey' -o tsv
$openaiEndpoint = az cognitiveservices account show --name $openaiAccount --resource-group $ResourceGroup --query 'properties.endpoint' -o tsv
$openaiKey = az cognitiveservices account keys list --name $openaiAccount --resource-group $ResourceGroup --query 'key1' -o tsv

Write-Host "  Search Endpoint: $searchEndpoint" -ForegroundColor Gray
Write-Host "  OpenAI Endpoint: $openaiEndpoint" -ForegroundColor Gray

# Configure function app settings
Write-Host "`nApplying settings to $funcRag..." -ForegroundColor Yellow
az functionapp config appsettings set `
    --name $funcRag `
    --resource-group $ResourceGroup `
    --settings `
        "AZURE_AI_SEARCH_ENDPOINT=$searchEndpoint" `
        "AZURE_AI_SEARCH_API_KEY=$searchKey" `
        "AZURE_AI_SEARCH_INDEX=kb-support" `
        "AZURE_OPENAI_ENDPOINT=$openaiEndpoint" `
        "AZURE_OPENAI_API_KEY=$openaiKey" `
        "AZURE_OPENAI_API_VERSION=2024-08-01-preview" `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ RAG function app configured successfully" -ForegroundColor Green
    
    # Test the endpoint
    Write-Host "`nTesting RAG endpoint..." -ForegroundColor Yellow
    $functionKey = az functionapp keys list --name $funcRag --resource-group $ResourceGroup --query "functionKeys.default" -o tsv
    
    Write-Host "  Endpoint: https://$funcRag.azurewebsites.net/api/rag-search" -ForegroundColor Gray
    Write-Host "  Function Key: $functionKey" -ForegroundColor Gray
    
    Write-Host "`nTest with curl:" -ForegroundColor Cyan
    Write-Host "curl -X POST 'https://$funcRag.azurewebsites.net/api/rag-search?code=$functionKey' -H 'Content-Type: application/json' -d '{\"question\": \"How do I reset my password?\"}'" -ForegroundColor Gray
    
} else {
    Write-Host "❌ Failed to configure RAG function app" -ForegroundColor Red
    exit 1
}
