# Test semantic search directly via REST API to verify @search.rerankerScore

$searchEndpoint = "https://srch-agents-dw7z4hg4ssn2k.search.windows.net"
$indexName = "kb-support"
$apiVersion = "2024-07-01"

# Get search API key
Write-Host "`n🔑 Getting search API key..." -ForegroundColor Cyan
$searchKey = az search admin-key show --resource-group rg-smart-agents-dev --service-name srch-agents-dw7z4hg4ssn2k --query "primaryKey" -o tsv

# Test semantic search query
$query = "VPN disconnects every 5 minutes"
$uri = "$searchEndpoint/indexes/$indexName/docs/search?api-version=$apiVersion"

$body = @{
    search = $query
    queryType = "semantic"
    semanticConfiguration = "semantic-config"
    top = 5
    select = "title,content"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "api-key" = $searchKey
}

Write-Host "`n🔍 Testing semantic search via REST API..." -ForegroundColor Cyan
Write-Host "Query: $query" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -Headers $headers

    Write-Host "`n✅ Search Results:" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

    foreach ($result in $response.value) {
        Write-Host "`nDocument: $($result.title)" -ForegroundColor Cyan

        # Check for semantic reranker score
        if ($result.'@search.rerankerScore') {
            Write-Host "  @search.rerankerScore: $($result.'@search.rerankerScore')" -ForegroundColor Green
        } else {
            Write-Host "  @search.rerankerScore: NOT PRESENT" -ForegroundColor Red
        }

        # Check for hybrid score
        if ($result.'@search.score') {
            Write-Host "  @search.score: $($result.'@search.score')" -ForegroundColor Yellow
        }
    }

    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

    # Summary
    $hasReranker = $response.value | Where-Object { $_.'@search.rerankerScore' }
    if ($hasReranker) {
        Write-Host "`n✅ SEMANTIC RANKING IS WORKING!" -ForegroundColor Green
        $maxReranker = ($response.value.'@search.rerankerScore' | Measure-Object -Maximum).Maximum
        Write-Host "Max reranker score: $maxReranker (0-4 range)" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  NO SEMANTIC RERANKER SCORES FOUND" -ForegroundColor Red
        Write-Host "This means semantic ranking is NOT executing." -ForegroundColor Red
    }

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response -ForegroundColor Red
}
