# Software Installation and Update Guide

## Overview

This guide covers requesting software installation, troubleshooting update issues, and managing applications on your corporate workstation.

## Software Request Process

### Standard Software Installation

For pre-approved software (Microsoft Office, Adobe Reader, Zoom, etc.):

1. **Self-Service Software Center**
   - Open "Company Portal" app on your computer
   - Browse "Available Applications"
   - Click software you need
   - Click "Install"
   - Wait for installation to complete (usually 10-30 minutes)
   - Restart computer if prompted

2. **Automatic Installation**
   - Some required software installs automatically
   - Check during login or startup
   - Do not interrupt installation process
   - Report errors to IT

### Custom or Specialized Software

For software not in standard catalog:

1. **Submit Software Request**
   - Go to https://requests.example.com/software
   - Fill out request form:
     - Software name and version
     - Business justification
     - Cost (if known)
     - Required deadline
   - Manager approval required
   - Security review may be needed

2. **Approval Process**
   - Manager reviews and approves/denies
   - IT Security reviews for compliance
   - Procurement handles licensing
   - IT schedules installation
   - Timeline: Usually 5-10 business days

3. **Installation Appointment**
   - IT will contact you to schedule
   - May require remote access to your computer
   - Keep computer on and unlocked
   - Installation typically takes 30-60 minutes

## Common Software Issues

### Application Won't Install

**Symptoms:**
- Installation fails partway through
- "Installation error" message
- Software appears installed but won't launch

**Solutions:**

1. **Check Disk Space**
   - Open File Explorer
   - Right-click C: drive > Properties
   - Need at least 20 GB free
   - Delete unnecessary files if low
   - Empty Recycle Bin

2. **Run as Administrator**
   - Right-click installer file
   - Select "Run as administrator"
   - Enter admin credentials if prompted
   - Complete installation

3. **Disable Antivirus Temporarily**
   - Antivirus may block installation
   - Temporarily disable during install
   - Re-enable immediately after
   - Add software to exceptions if needed

4. **Install Prerequisites**
   - Some software needs other components first
   - Install .NET Framework, Visual C++, etc.
   - Check software requirements documentation
   - IT can install prerequisites remotely

### Software Updates Failing

**Symptoms:**
- "Update failed" notifications
- Application runs but shows "update available" constantly
- Features not working after update

**Solutions:**

1. **Windows Updates First**
   - Open Settings > Update & Security
   - Click "Check for updates"
   - Install all Windows updates
   - Restart computer
   - Then try software update again

2. **Clear Update Cache**
   - Close the application completely
   - Delete temporary update files
   - Windows: C:\Windows\SoftwareDistribution\Download
   - Restart computer
   - Reopen application and retry update

3. **Manual Update Download**
   - Visit software vendor website
   - Download latest version directly
   - Uninstall old version first (usually)
   - Install new version
   - Restart computer

4. **IT-Managed Updates**
   - Some software updated centrally by IT
   - Do not manually update these apps
   - Wait for automatic deployment
   - Contact IT if update seems delayed

### Application Crashes or Won't Open

**Symptoms:**
- Application closes immediately after opening
- "Application error" or "stopped working" message
- Freezes and becomes unresponsive

**Solutions:**

1. **Restart Computer**
   - Save all work first
   - Fully shut down (not just sleep)
   - Wait 30 seconds
   - Turn back on
   - Try opening application

2. **Clear Application Cache**
   - Close application completely
   - Delete cache/temp files:
     - Excel: C:\Users\[username]\AppData\Local\Microsoft\Office\16.0
     - Chrome: Settings > Privacy > Clear browsing data
     - Outlook: Delete .ost file (it will rebuild)
   - Restart application

3. **Repair Installation**
   - Windows Settings > Apps
   - Find application in list
   - Click > Advanced options
   - Click "Repair"
   - Wait for repair to complete
   - Try opening application

4. **Reinstall Application**
   - Uninstall completely
   - Restart computer
   - Reinstall fresh copy
   - Import settings/preferences if needed

### License Activation Issues

**Symptoms:**
- "Product activation required" message
- Features disabled due to licensing
- "Your license has expired"

**Solutions:**

1. **Verify License Assignment**
   - Contact IT to confirm license assigned to you
   - May need manager approval for certain licenses
   - IT will assign and activate remotely

2. **Re-activate Product**
   - Open application
   - Help > About > License information
   - Click "Activate" or "Sign in"
   - Use corporate credentials
   - Wait for activation confirmation

3. **Check Online Activation**
   - Ensure computer connected to internet
   - Some licenses require online verification
   - VPN may interfere - try without VPN
   - Firewall might block activation - contact IT

## Software Best Practices

### Approved Software List

**Always allowed:**
- Microsoft Office Suite (Word, Excel, PowerPoint, Outlook)
- Adobe Acrobat Reader
- Web browsers (Chrome, Edge, Firefox)
- Zoom, Microsoft Teams
- VPN client
- Password managers (company-approved)

**Requires approval:**
- Development tools (Visual Studio, etc.)
- Design software (Adobe Creative Suite)
- Specialized industry software
- Database tools
- Video editing software

**Never allowed:**
- Torrent clients
- Unlicensed software
- Personal cloud storage (Dropbox, personal OneDrive)
- Games
- Cryptocurrency miners

### Keeping Software Updated

1. **Enable Auto-Updates** (when available)
   - Microsoft Office: Auto-update enabled by default
   - Web browsers: Check automatically
   - Windows: Updates managed by IT

2. **Check Manually Monthly**
   - Open each main application
   - Look for "Check for updates" option
   - Install important updates
   - Restart if required

3. **IT-Managed Updates**
   - Many updates deployed automatically
   - May happen during off-hours
   - Don't interrupt update process
   - Computer may restart overnight

### Security Considerations

- Only install software from official sources
- Don't download from random websites
- Verify downloads are legitimate
- Report suspicious software to security@example.com
- Use company-approved alternatives when possible

## Mobile Device Management (MDM)

### Company Portal App

Install on personal devices used for work:

1. **iOS Devices**
   - Download "Company Portal" from App Store
   - Sign in with corporate credentials
   - Allow device management
   - Install required apps (Outlook, Teams, etc.)

2. **Android Devices**
   - Download "Company Portal" from Google Play
   - Sign in with corporate email
   - Complete device enrollment
   - Install work profile apps

### Work vs. Personal Apps

- Work apps installed in work profile
- Data separated from personal apps
- IT can wipe work apps remotely (not personal)
- Some restrictions on work profile apps

## Troubleshooting Specific Applications

### Microsoft Office Issues

**Outlook won't open:**
- Run Outlook in safe mode: `outlook.exe /safe`
- Disable add-ins causing conflicts
- Rebuild Outlook profile if needed

**Excel crashes on large files:**
- Disable hardware acceleration
- Increase memory allocation
- Break file into smaller workbooks

**Word formatting issues:**
- Reset to default template
- Clear formatting cache
- Check for corrupted Normal.dotm

### Web Browser Problems

**Browser slow or crashing:**
- Clear cache and cookies
- Disable unnecessary extensions
- Reset browser to defaults
- Try different browser

**Websites not loading:**
- Clear DNS cache: `ipconfig /flushdns`
- Check proxy settings
- Disable VPN if not needed
- Try incognito/private mode

### Adobe Software

**Acrobat won't open PDFs:**
- Repair Acrobat installation
- Set as default PDF viewer
- Update to latest version

**Creative Cloud login issues:**
- Sign out and sign back in
- Clear Creative Cloud cache
- Reinstall Creative Cloud desktop app

## Getting Help

### Self-Help Resources

- Software Catalog: https://software.example.com
- Installation Guides: https://guides.example.com
- Video Tutorials: https://training.example.com
- FAQ: https://support.example.com/software-faq

### IT Support

**For Installation Requests:**
- Portal: https://requests.example.com/software
- Email: softwarerequest@example.com
- Include: Software name, version, business justification

**For Technical Issues:**
- Email: itsupport@example.com
- Phone: 1-800-IT-SUPPORT
- Chat: https://support.example.com/chat
- Response time: Within 4 hours

**For Urgent Issues:**
- Call: 1-800-IT-URGENT (business-critical issues only)
- Response time: Within 1 hour

### Information to Provide

When contacting IT support about software issues:
- Software name and version
- Operating system (Windows/Mac, version)
- Error message (exact text or screenshot)
- What you were doing when error occurred
- Whether problem is new or recurring
- Steps you've already tried
- Business impact (how urgently you need it fixed)
