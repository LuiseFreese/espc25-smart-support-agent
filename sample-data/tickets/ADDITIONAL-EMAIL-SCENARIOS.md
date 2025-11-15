# Additional Test Email Scenarios

Send these emails to **YOUR_SUPPORT_EMAIL@yourdomain.com** to test the support agent.

## Scenario 9: Software License Expiry (Software/High)

**Subject:** URGENT: Adobe Creative Cloud license expired - team blocked

**Body:**
```
Hello Support,

Our entire design team (15 people) cannot access Adobe Creative Cloud this morning. The license appears to have expired overnight and we have critical client deliverables due today.

Error message: "Your subscription has expired. Contact your administrator."

We need this resolved immediately as we have presentations to clients in 3 hours.

Thanks,
Marcus Chen
Creative Director
```

**Expected:**
- Category: Software
- Priority: High (keywords: "URGENT", "immediately", "critical")

---

## Scenario 10: Email Attachment Size Issue (Other/Medium)

**Subject:** Cannot send emails with attachments

**Body:**
```
Hi,

I'm trying to send a proposal document (8MB PDF) to a client but keep getting an error that the file is too large. I've compressed it as much as possible but still can't send it.

Is there a way to increase the attachment size limit or use a file sharing service instead?

Thanks,
Rachel Martinez
Sales
```

**Expected:**
- Category: Other
- Priority: Medium

---

## Scenario 11: Multi-Factor Authentication Locked Out (Access/High)

**Subject:** MFA locked - cannot access any systems

**Body:**
```
HELP!

I got a new phone and forgot to transfer my authenticator app. Now I'm completely locked out of all company systems because MFA is failing. I can't access email, SharePoint, Teams - nothing works.

I'm working from home today and have urgent work that needs to be done. Please unlock my MFA settings or provide an alternative way to authenticate.

Employee ID: EMP-4521
Phone: +1-555-0123

- Tom Anderson
```

**Expected:**
- Category: Access  
- Priority: High (keywords: "HELP", "urgent", "locked out")

---

## Scenario 12: Slow Computer Performance (Software/Low)

**Subject:** Laptop running slowly

**Body:**
```
Hello,

My laptop has been running pretty slow lately - takes a while to open applications and files. It's not urgent but would be nice to get it checked out when someone has time.

Probably just needs a cleanup or something.

Thanks,
Jennifer Lee
HR Department
```

**Expected:**
- Category: Software
- Priority: Low (keywords: "not urgent", "when someone has time")

---

## Scenario 13: Invoice Payment Question (Billing/Medium)

**Subject:** Question about November invoice payment method

**Body:**
```
Dear Support Team,

I need to update our payment method for the November invoice. Our corporate credit card was recently renewed with a new expiration date and CVV.

Invoice #: INV-2025-11-045
Amount: $2,499.00
Current card ending in: 4532

Can you send me a secure link to update the payment information?

Best regards,
Patricia Williams
Accounts Payable
```

**Expected:**
- Category: Billing
- Priority: Medium

---

## Scenario 14: Teams Video Not Working (Software/Medium)

**Subject:** Teams camera not working in meetings

**Body:**
```
Hi Support,

During Teams video calls, participants say they can't see me. My camera is working fine in other applications (tested with Camera app), but in Teams it shows a black screen.

I have an important client meeting tomorrow morning and need this working. I've already tried:
- Restarting Teams
- Checking camera permissions
- Restarting my computer

Device: Surface Laptop 5
OS: Windows 11

Thanks,
Kevin Brown
Account Manager
```

**Expected:**
- Category: Software
- Priority: Medium

---

## Scenario 15: Network Drive Access Denied (Network/Medium)

**Subject:** Cannot access shared network drive

**Body:**
```
Hello,

I'm getting "Access Denied" when trying to open the Finance shared drive (\\fileserver\finance). I could access it yesterday but today it's not working.

Other network drives work fine, just this one has the issue.

Drive path: \\fileserver\finance
My username: dbaker

Thanks,
David Baker
Finance Analyst
```

**Expected:**
- Category: Network
- Priority: Medium

---

## Scenario 16: New Employee Setup (Access/Medium)

**Subject:** New hire needs account setup

**Body:**
```
Hi IT,

We have a new employee starting Monday (Nov 18) who needs their accounts set up:

Name: Amanda Rodriguez
Department: Marketing  
Role: Marketing Coordinator
Manager: Sarah Johnson
Office: Building B, 3rd floor

Please create:
- Email account
- Teams access
- SharePoint permissions for Marketing folder
- Standard software package (Office 365, Adobe)

Let me know if you need any additional information.

Thanks,
Laura Martinez
HR Manager
```

**Expected:**
- Category: Access
- Priority: Medium

---

## Quick Copy-Paste Formats

### Adobe License (Software/High)
```
Subject: URGENT: Adobe Creative Cloud license expired - team blocked
Body: Our entire design team cannot access Adobe Creative Cloud. License expired overnight. Critical client deliverables due today. Need immediate resolution - presentations in 3 hours. Error: "Your subscription has expired." - Marcus Chen, Creative Director
```

### Attachment Issue (Other/Medium)
```
Subject: Cannot send emails with attachments
Body: Trying to send 8MB PDF proposal to client but getting file too large error. Already compressed. Can we increase limit or use file sharing? - Rachel Martinez, Sales
```

### MFA Lockout (Access/High)
```
Subject: MFA locked - cannot access any systems
Body: HELP! New phone, forgot to transfer authenticator app. Completely locked out - email, SharePoint, Teams all failing MFA. Working from home with urgent work. Employee ID: EMP-4521. - Tom Anderson
```

### Slow Computer (Software/Low)
```
Subject: Laptop running slowly
Body: Laptop slow lately - applications and files take a while to open. Not urgent but would be nice to get checked when someone has time. Probably needs cleanup. - Jennifer Lee, HR
```

### Invoice Payment (Billing/Medium)
```
Subject: Question about November invoice payment method
Body: Need to update payment method for November invoice. Corporate card renewed with new expiration. Invoice INV-2025-11-045, $2,499.00. Send secure link to update? - Patricia Williams, Accounts Payable
```

### Teams Camera (Software/Medium)
```
Subject: Teams camera not working in meetings
Body: Teams shows black screen during video calls. Camera works in other apps. Important client meeting tomorrow. Already tried restarting Teams and computer. Surface Laptop 5, Windows 11. - Kevin Brown, Account Manager
```

### Network Drive (Network/Medium)
```
Subject: Cannot access shared network drive
Body: Getting "Access Denied" on Finance drive (\\fileserver\finance). Worked yesterday, not today. Other drives work fine. Username: dbaker - David Baker, Finance Analyst
```

### New Employee (Access/Medium)
```
Subject: New hire needs account setup
Body: New employee Amanda Rodriguez starting Monday Nov 18. Marketing Coordinator reporting to Sarah Johnson. Needs: Email, Teams, SharePoint Marketing access, Office 365 + Adobe. - Laura Martinez, HR Manager
```

---

## Testing Script

```powershell
# Send all test emails via POST endpoint
$functionUrl = "https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/processsupportemail"
$functionKey = "YOUR_FUNCTION_KEY_HERE"

$scenarios = @(
    @{ subject = "URGENT: Adobe Creative Cloud license expired"; body = "Our design team cannot access Adobe. License expired overnight. Critical deliverables today. URGENT resolution needed."; expectedCategory = "Software"; expectedPriority = "High" }
    @{ subject = "Cannot send emails with attachments"; body = "Trying to send 8MB PDF but getting file too large error. Can we increase limit?"; expectedCategory = "Other"; expectedPriority = "Medium" }
    @{ subject = "MFA locked - cannot access systems"; body = "HELP! New phone, authenticator app not transferred. Completely locked out. Urgent work needed."; expectedCategory = "Access"; expectedPriority = "High" }
)

foreach ($scenario in $scenarios) {
    Write-Host "`nTesting: $($scenario.subject)" -ForegroundColor Cyan
    $body = @{
        subject = $scenario.subject
        body = $scenario.body
        from = "test@example.com"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri $functionUrl -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-functions-key" = $functionKey }
    Write-Host "  Ticket: $($result.ticketId)" -ForegroundColor White
    Write-Host "  Category: $($result.category) (Expected: $($scenario.expectedCategory))" -ForegroundColor $(if($result.category -eq $scenario.expectedCategory){'Green'}else{'Yellow'})
    Write-Host "  Priority: $($result.priority) (Expected: $($scenario.expectedPriority))" -ForegroundColor $(if($result.priority -eq $scenario.expectedPriority){'Green'}else{'Yellow'})
}
```

