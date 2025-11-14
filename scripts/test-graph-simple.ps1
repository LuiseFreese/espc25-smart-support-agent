# Test Graph API Authentication
$tenantId = "b469e370-d6a6-45b5-928e-856ae0307a6d"
$clientId = "f2b47ff8-c292-4231-9365-a607f2689c43"
$supportEmail = "luisefreese@hscluise.onmicrosoft.com"

Write-Host "Testing Graph API authentication..." -ForegroundColor Cyan

Write-Host "1. Getting client secret..."
$clientSecret = az functionapp config appsettings list --name func-agents-dw7z4hg4ssn2k --resource-group rg-smart-agents-dev --query "[?name=='GRAPH_CLIENT_SECRET'].value | [0]" -o tsv

Write-Host "2. Requesting access token..."
$tokenBody = @{
    client_id = $clientId
    scope = "https://graph.microsoft.com/.default"
    client_secret = $clientSecret
    grant_type = "client_credentials"
}

$tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Method Post -Body $tokenBody -ContentType "application/x-www-form-urlencoded"
Write-Host "   Token acquired" -ForegroundColor Green

Write-Host "3. Testing mailbox access..."
$headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }
$uri = "https://graph.microsoft.com/v1.0/users/$supportEmail/mailFolders/Inbox/messages?`$top=5&`$select=id,subject"
$messages = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers

Write-Host "   Success! Found $($messages.value.Count) message(s)" -ForegroundColor Green
$messages.value | ForEach-Object { Write-Host "   - $($_.subject)" -ForegroundColor Cyan }
