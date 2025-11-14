# Simple Test Script: Test ProcessSupportEmail Function
# Quick test of the email-to-ticket flow

$functionUrl = "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail"
$functionKey = "YOUR_FUNCTION_KEY_HERE"

Write-Host "`n=== Testing ProcessSupportEmail ===" -ForegroundColor Cyan

$requestBody = @{
    subject = "VPN keeps disconnecting"
    body = "Hi, I'm having trouble with the VPN. It disconnects every few minutes and I can't get any work done. Please help!"
    from = "user1@example.com"
    receivedDateTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

Write-Host "Calling function..." -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $functionUrl `
        -Method Post `
        -Body $requestBody `
        -ContentType "application/json" `
        -Headers @{ "x-functions-key" = $functionKey } `
        -ErrorAction Stop

    Write-Host "`n✓ SUCCESS!" -ForegroundColor Green
    Write-Host "Ticket ID: $($response.ticketId)" -ForegroundColor Cyan
    Write-Host "Category: $($response.category)" -ForegroundColor White
    Write-Host "Priority: $($response.priority)" -ForegroundColor White
    Write-Host "Status: $($response.status)" -ForegroundColor White
    Write-Host "Confidence: $($response.confidence)" -ForegroundColor White

    if ($response.suggestedResponse) {
        Write-Host "`nAI Response:" -ForegroundColor Magenta
        Write-Host $response.suggestedResponse -ForegroundColor Gray
    }

} catch {
    Write-Host "`n✗ FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`nTest complete!`n" -ForegroundColor Cyan

