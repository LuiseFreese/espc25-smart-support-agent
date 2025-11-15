# Test Demo 02: RAG Search Function
# Tests the RAG search endpoint with various support scenarios

# Load environment variables from .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#].+?)=(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$key" -Value $value
        }
    }
    Write-Host "✓ Loaded configuration from .env" -ForegroundColor Green
}

$ragKey = $env:RAG_FUNCTION_KEY
$ragEndpoint = $env:RAG_FUNCTION_URL
if (-not $ragKey -or -not $ragEndpoint) {
    Write-Host "ERROR: Missing RAG configuration!" -ForegroundColor Red
    Write-Host "Make sure .env file exists with RAG_FUNCTION_KEY and RAG_FUNCTION_URL" -ForegroundColor Yellow
    exit 1
}

$ragEndpoint = "$ragEndpoint/api/rag-search"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Demo 02: RAG Search Validation" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$tests = @(
    @{ query = "How do I reset my password?"; expected = "Password/Access" },
    @{ query = "VPN keeps disconnecting"; expected = "Network/VPN" },
    @{ query = "I was charged twice on my bill"; expected = "Billing" },
    @{ query = "Can't install Office 365"; expected = "Software" },
    @{ query = "How do I configure MFA?"; expected = "Security/Access" }
)

$results = @()

foreach ($test in $tests) {
    Write-Host "Testing: $($test.query)" -ForegroundColor Yellow
    
    try {
        $body = @{ question = $test.query } | ConvertTo-Json
        $response = Invoke-RestMethod `
            -Uri $ragEndpoint `
            -Method Post `
            -Body $body `
            -ContentType "application/json" `
            -Headers @{ "x-functions-key" = $ragKey }
        
        $results += [PSCustomObject]@{
            Query = $test.query
            Confidence = $response.confidence
            AnswerLength = $response.answer.Length
            Expected = $test.expected
            Status = if ($response.confidence -ge 0.6) { "✅ High" } else { "⚠️ Low" }
        }
        
        Write-Host "  Confidence: $($response.confidence)" -ForegroundColor Green
        Write-Host "  Answer length: $($response.answer.Length) chars" -ForegroundColor Green
        Write-Host "  Answer preview: $($response.answer.Substring(0, [Math]::Min(100, $response.answer.Length)))...`n" -ForegroundColor Gray
        
    } catch {
        Write-Host "  ❌ FAILED: $($_.Exception.Message)`n" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Query = $test.query
            Confidence = 0
            AnswerLength = 0
            Expected = $test.expected
            Status = "❌ Failed"
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$results | Format-Table -AutoSize

$passed = ($results | Where-Object { $_.Confidence -ge 0.6 }).Count
$total = $results.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor Cyan
Write-Host "Passed (Confidence ≥0.6): $passed" -ForegroundColor Green
Write-Host "Failed: $($total - $passed)" -ForegroundColor $(if ($total -eq $passed) { "Green" } else { "Red" })
Write-Host "`nAverage Confidence: $(($results | Measure-Object -Property Confidence -Average).Average.ToString('0.00'))" -ForegroundColor Cyan
