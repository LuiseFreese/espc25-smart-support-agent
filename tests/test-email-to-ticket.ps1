# Test Script: Simulate Email-to-Ticket Flow
# This script tests the complete support ticket creation flow

Write-Host "`n=== SMART SUPPORT AGENT E2E TEST ===" -ForegroundColor Cyan
Write-Host "Testing email-to-ticket flow with simulated data`n" -ForegroundColor Gray

# Configuration
$functionUrl = "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail"
$functionKey = "YOUR_FUNCTION_KEY_HERE"

# Test Cases
$testEmails = @(
    @{
        subject = "VPN keeps disconnecting"
        body = "Hi, I'm having trouble with the VPN. It disconnects every few minutes and I can't get any work done. Please help!"
        from = "user1@example.com"
        expectedCategory = "Network"
        expectedPriority = "High"
    },
    @{
        subject = "Password reset request"
        body = "I forgot my password and need to reset it. How do I do that?"
        from = "user2@example.com"
        expectedCategory = "Access"
        expectedPriority = "Medium"
    },
    @{
        subject = "Billing question"
        body = "I was charged twice this month. Can someone look into this and issue a refund?"
        from = "user3@example.com"
        expectedCategory = "Billing"
        expectedPriority = "Medium"
    }
)

$results = @()

foreach ($email in $testEmails) {
    Write-Host "`n$('─' * 70)" -ForegroundColor DarkGray
    Write-Host "Testing: $($email.subject)" -ForegroundColor Yellow
    Write-Host "From: $($email.from)" -ForegroundColor Gray
    Write-Host "Body: $($email.body.Substring(0, [Math]::Min(60, $email.body.Length)))..." -ForegroundColor Gray

    # Prepare request body
    $requestBody = @{
        subject = $email.subject
        body = $email.body
        from = $email.from
        receivedDateTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    } | ConvertTo-Json

    try {
        Write-Host "`nSending request to ProcessSupportEmail..." -ForegroundColor Gray

        # Call the function with authentication
        $response = Invoke-RestMethod -Uri $functionUrl `
            -Method Post `
            -Body $requestBody `
            -ContentType "application/json" `
            -Headers @{ "x-functions-key" = $functionKey } `
            -ErrorAction Stop

        # Display results
        Write-Host "`n✓ Ticket Created Successfully!" -ForegroundColor Green
        Write-Host "  Ticket ID: $($response.ticketId)" -ForegroundColor Cyan
        Write-Host "  Category: $($response.category)" -ForegroundColor White
        Write-Host "  Priority: $($response.priority)" -ForegroundColor White
        Write-Host "  Status: $($response.status)" -ForegroundColor White

        if ($response.suggestedResponse) {
            Write-Host "`n  AI-Generated Response:" -ForegroundColor Magenta
            Write-Host "  $($response.suggestedResponse.Substring(0, [Math]::Min(150, $response.suggestedResponse.Length)))..." -ForegroundColor Gray
        }

        # Validation
        $categoryMatch = $response.category -eq $email.expectedCategory
        $priorityMatch = $response.priority -eq $email.expectedPriority

        if ($categoryMatch -and $priorityMatch) {
            Write-Host "`n  ✓ Classification Correct!" -ForegroundColor Green
        } else {
            Write-Host "`n  ⚠ Classification Mismatch:" -ForegroundColor Yellow
            if (-not $categoryMatch) {
                Write-Host "    Expected Category: $($email.expectedCategory), Got: $($response.category)" -ForegroundColor Yellow
            }
            if (-not $priorityMatch) {
                Write-Host "    Expected Priority: $($email.expectedPriority), Got: $($response.priority)" -ForegroundColor Yellow
            }
        }

        $results += @{
            Subject = $email.subject
            Success = $true
            TicketId = $response.ticketId
            Category = $response.category
            Priority = $response.priority
            HasResponse = $null -ne $response.suggestedResponse
        }

    } catch {
        Write-Host "`n✗ Test Failed!" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red

        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "  Status Code: $statusCode" -ForegroundColor Red
        }

        $results += @{
            Subject = $email.subject
            Success = $false
            Error = $_.Exception.Message
        }
    }

    Start-Sleep -Seconds 2
}

# Summary
Write-Host "`n`n$('═' * 70)" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "$('═' * 70)" -ForegroundColor Cyan

$successCount = ($results | Where-Object { $_.Success }).Count
$totalCount = $results.Count

Write-Host "`nTotal Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $successCount" -ForegroundColor Green
Write-Host "Failed: $($totalCount - $successCount)" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Red" })

if ($successCount -gt 0) {
    Write-Host "`nCreated Tickets:" -ForegroundColor Yellow
    foreach ($result in $results | Where-Object { $_.Success }) {
        Write-Host "  • $($result.TicketId) - $($result.Subject) [$($result.Category)/$($result.Priority)]" -ForegroundColor Gray
        if ($result.HasResponse) {
            Write-Host "    ✓ AI response generated" -ForegroundColor Green
        }
    }
}

Write-Host "`n$('═' * 70)" -ForegroundColor Cyan
Write-Host "Test complete! Check Azure Table Storage for tickets." -ForegroundColor Cyan
Write-Host "$('═' * 70)`n" -ForegroundColor Cyan

