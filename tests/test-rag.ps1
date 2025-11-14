# Test RAG Function

$ragUrl = "https://func-rag-dw7z4hg4ssn2k.azurewebsites.net/api/rag-search"
$ragApiKey = "YOUR_RAG_FUNCTION_KEY_HERE"

Write-Host "Testing RAG Search Function" -ForegroundColor Cyan
Write-Host ""

$requestBody = @{
    query = "How do I reset my password?"
} | ConvertTo-Json

Write-Host "Query: How do I reset my password?" -ForegroundColor Gray
Write-Host "Calling RAG function..." -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $ragUrl `
        -Method Post `
        -Body $requestBody `
        -ContentType "application/json" `
        -Headers @{ "x-functions-key" = $ragApiKey } `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Answer: $($response.answer)" -ForegroundColor White
    Write-Host "Confidence: $($response.confidence)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Sources:" -ForegroundColor Yellow
    foreach ($source in $response.sources) {
        Write-Host "  - $source" -ForegroundColor Gray
    }

} catch {
    Write-Host ""
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Test complete!" -ForegroundColor Cyan

