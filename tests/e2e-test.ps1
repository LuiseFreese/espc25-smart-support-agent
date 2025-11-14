# Comprehensive E2E Test: Email-to-Ticket Flow

$functionUrl = "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail"
$functionKey = "YOUR_FUNCTION_KEY_HERE"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SMART SUPPORT AGENT - END-TO-END TEST" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$testCases = @(
    @{
        name = "VPN Issue"
        subject = "VPN keeps disconnecting"
        body = "Hi, I'm having trouble with the VPN. It disconnects every few minutes and I can't get any work done. Please help!"
        from = "user1@example.com"
        expectedCategory = "Network"
        expectedPriority = "Medium"
    },
    @{
        name = "Password Reset"
        subject = "Password reset request"
        body = "I forgot my password and need to reset it. How do I do that?"
        from = "user2@example.com"
        expectedCategory = "Access"
        expectedPriority = "Medium"
    },
    @{
        name = "Billing Question"
        subject = "Billing question"
        body = "I was charged twice this month. Can someone look into this and issue a refund?"
        from = "user3@example.com"
        expectedCategory = "Billing"
        expectedPriority = "Medium"
    }
)

$results = @()

foreach ($test in $testCases) {
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Test: $($test.name)" -ForegroundColor Yellow
    Write-Host "Subject: $($test.subject)" -ForegroundColor Gray
    Write-Host ""

    $requestBody = @{
        subject = $test.subject
        body = $test.body
        from = $test.from
        receivedDateTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $functionUrl `
            -Method Post `
            -Body $requestBody `
            -ContentType "application/json" `
            -Headers @{ "x-functions-key" = $functionKey } `
            -ErrorAction Stop

        $categoryMatch = $response.category -eq $test.expectedCategory
        $priorityMatch = $response.priority -eq $test.expectedPriority

        Write-Host "RESULT: SUCCESS" -ForegroundColor Green
        Write-Host "  Ticket ID:  $($response.ticketId)" -ForegroundColor Cyan
        Write-Host "  Category:   $($response.category) $(if ($categoryMatch) { '[OK]' } else { '[Expected: ' + $test.expectedCategory + ']' })" -ForegroundColor $(if ($categoryMatch) { "White" } else { "Yellow" })
        Write-Host "  Priority:   $($response.priority) $(if ($priorityMatch) { '[OK]' } else { '[Expected: ' + $test.expectedPriority + ']' })" -ForegroundColor $(if ($priorityMatch) { "White" } else { "Yellow" })
        Write-Host "  Status:     $($response.status)" -ForegroundColor White
        Write-Host "  Confidence: $($response.confidence)" -ForegroundColor White
        Write-Host ""

        if ($response.suggestedResponse) {
            $preview = $response.suggestedResponse.Substring(0, [Math]::Min(80, $response.suggestedResponse.Length))
            Write-Host "  AI Response: $preview..." -ForegroundColor Magenta
        }

        $results += @{
            Name = $test.name
            Success = $true
            TicketId = $response.ticketId
            Category = $response.category
            Priority = $response.priority
            Confidence = $response.confidence
            CategoryMatch = $categoryMatch
            PriorityMatch = $priorityMatch
        }

    } catch {
        Write-Host "RESULT: FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red

        $results += @{
            Name = $test.name
            Success = $false
            Error = $_.Exception.Message
        }
    }

    Write-Host ""
}

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $results.Count
$passedTests = ($results | Where-Object { $_.Success }).Count
$failedTests = $totalTests - $passedTests

Write-Host "Total Tests:  $totalTests" -ForegroundColor White
Write-Host "Passed:       $passedTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host "Failed:       $failedTests" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($passedTests -gt 0) {
    Write-Host "Created Tickets:" -ForegroundColor Yellow
    foreach ($result in $results | Where-Object { $_.Success }) {
        $classification = "[$($result.Category)/$($result.Priority)]"
        $accuracy = ""
        if ($result.CategoryMatch -and $result.PriorityMatch) {
            $accuracy = "[100% accurate]"
        } elseif ($result.CategoryMatch -or $result.PriorityMatch) {
            $accuracy = "[50% accurate]"
        } else {
            $accuracy = "[misclassified]"
        }

        Write-Host "  $($result.TicketId)" -ForegroundColor Cyan -NoNewline
        Write-Host " - $($result.Name) $classification $accuracy" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "E2E Test Complete!" -ForegroundColor Green
Write-Host "Check Azure Table Storage for full ticket details." -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

