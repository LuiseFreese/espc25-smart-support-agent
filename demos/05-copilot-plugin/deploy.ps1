# Deploy Copilot Plugin to Teams
# This script packages the app and provides instructions for deployment

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Copilot Plugin Deployment Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Validate files exist
Write-Host "Step 1: Validating files..." -ForegroundColor Yellow
$requiredFiles = @(
    "appPackage\manifest.json",
    "appPackage\ai-plugin.json",
    "appPackage\openapi.json",
    "appPackage\color.png",
    "appPackage\outline.png"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file MISSING" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`nError: Missing required files. Please create them first." -ForegroundColor Red
    exit 1
}

# Step 2: Create deployment package
Write-Host "`nStep 2: Creating deployment package..." -ForegroundColor Yellow
$zipPath = "ITSupportPlugin.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "  Removed existing package" -ForegroundColor Gray
}

Compress-Archive -Path appPackage\* -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "  ✓ Created $zipPath" -ForegroundColor Green

# Get file size
$fileSize = (Get-Item $zipPath).Length / 1KB
Write-Host "  Package size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Gray

# Step 3: Deployment instructions
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment Instructions" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Your plugin package is ready: $zipPath`n" -ForegroundColor Green

Write-Host "OPTION 1: Deploy via Teams Admin Center" -ForegroundColor Yellow
Write-Host "  1. Go to https://admin.teams.microsoft.com" -ForegroundColor White
Write-Host "  2. Navigate to: Teams apps > Manage apps" -ForegroundColor White
Write-Host "  3. Click: Upload new app > Upload" -ForegroundColor White
Write-Host "  4. Select: $zipPath" -ForegroundColor White
Write-Host "  5. Review and approve the app" -ForegroundColor White
Write-Host "  6. Assign to users or make available org-wide`n" -ForegroundColor White

Write-Host "OPTION 2: Sideload in Teams (for testing)" -ForegroundColor Yellow
Write-Host "  1. Open Microsoft Teams" -ForegroundColor White
Write-Host "  2. Click Apps > Manage your apps" -ForegroundColor White
Write-Host "  3. Click: Upload an app > Upload a custom app" -ForegroundColor White
Write-Host "  4. Select: $zipPath" -ForegroundColor White
Write-Host "  5. Click Add to install`n" -ForegroundColor White

Write-Host "OPTION 3: Deploy via Microsoft 365 Admin Center" -ForegroundColor Yellow
Write-Host "  1. Go to https://admin.microsoft.com" -ForegroundColor White
Write-Host "  2. Navigate to: Settings > Integrated apps" -ForegroundColor White
Write-Host "  3. Click: Upload custom apps" -ForegroundColor White
Write-Host "  4. Select: $zipPath" -ForegroundColor White
Write-Host "  5. Configure deployment settings`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Post-Deployment Steps" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Install plugin in Copilot:" -ForegroundColor Yellow
Write-Host "   - Open Microsoft 365 Copilot (copilot.microsoft.com)" -ForegroundColor White
Write-Host "   - Click Plugins icon (puzzle piece)" -ForegroundColor White
Write-Host "   - Search for 'IT Support Agent'" -ForegroundColor White
Write-Host "   - Click Add`n" -ForegroundColor White

Write-Host "2. Test with these queries:" -ForegroundColor Yellow
Write-Host "   - 'How do I reset my password?'" -ForegroundColor White
Write-Host "   - 'My VPN keeps disconnecting'" -ForegroundColor White
Write-Host "   - 'I was charged twice on my bill'" -ForegroundColor White
Write-Host "   - 'How do I install Office 365?'`n" -ForegroundColor White

Write-Host "3. Configure API key:" -ForegroundColor Yellow
Write-Host "   - In Teams Admin Center, go to app settings" -ForegroundColor White
Write-Host "   - Add FUNCTION_KEY secret with your RAG function key" -ForegroundColor White
Write-Host "   - Key vault reference ID: FUNCTION_KEY`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Troubleshooting" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "If plugin doesn't appear:" -ForegroundColor Yellow
Write-Host "  - Wait 5-10 minutes for app catalog sync" -ForegroundColor White
Write-Host "  - Check app approval status in Teams Admin Center" -ForegroundColor White
Write-Host "  - Verify user has M365 Copilot license" -ForegroundColor White
Write-Host "  - Try signing out/in to Copilot`n" -ForegroundColor White

Write-Host "If plugin doesn't trigger:" -ForegroundColor Yellow
Write-Host "  - Verify API key is configured correctly" -ForegroundColor White
Write-Host "  - Test RAG function directly (see Demo 02 README)" -ForegroundColor White
Write-Host "  - Check function logs in Azure Portal" -ForegroundColor White
Write-Host "  - Review semantic descriptions in ai-plugin.json`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "After deployment, consider:" -ForegroundColor Yellow
Write-Host "  - Expanding knowledge base (add more documents)" -ForegroundColor White
Write-Host "  - Adding ticket creation action (Phase 2)" -ForegroundColor White
Write-Host "  - Collecting user feedback" -ForegroundColor White
Write-Host "  - Monitoring usage in Application Insights`n" -ForegroundColor White

Write-Host "For more details, see: demos/05-copilot-plugin/README.md`n" -ForegroundColor Gray
