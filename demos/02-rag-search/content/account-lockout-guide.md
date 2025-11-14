# Account Lockout and Access Issues Resolution Guide

## Overview

This guide helps you resolve account lockout situations, login problems, and access-related issues with your corporate account.

## Understanding Account Lockouts

### What Causes Account Lockouts?

Your account can be locked for several reasons:

1. **Too Many Failed Login Attempts**
   - 5 incorrect password entries within 15 minutes
   - Automatic lock for security purposes
   - Prevents brute force attacks

2. **Suspicious Activity Detection**
   - Login from unusual location
   - Multiple devices accessing simultaneously
   - Pattern matching potential compromise

3. **Expired Password**
   - Passwords expire every 90 days
   - Must change before logging in
   - System locks account at expiration

4. **Inactive Account**
   - No login for 60+ days
   - Automatic deactivation for security
   - Common after extended leave

5. **Administrative Action**
   - Security investigation
   - Policy violation
   - Pending HR review

## How to Tell If Your Account is Locked

### Common Symptoms

- "Your account has been locked" message
- "Too many failed login attempts" error
- "Account disabled - contact administrator"
- Cannot log into any company systems
- Email access denied
- VPN connection rejected

### Difference Between Locked, Disabled, and Expired

**Locked Account:**
- Temporary (auto-unlocks in 30 minutes)
- Usually due to failed login attempts
- Can be manually unlocked by IT

**Disabled Account:**
- Requires administrator action
- Usually permanent until resolved
- Often related to security or HR issues

**Expired Password:**
- Must reset password to continue
- Account functions normally after reset
- Not technically "locked"

## Unlocking Your Account

### Method 1: Wait for Auto-Unlock (30 Minutes)

If locked due to failed login attempts:
1. Stop trying to log in
2. Wait 30 minutes without any login attempts
3. Account automatically unlocks
4. Try logging in again with correct password
5. Be careful - more failures will lock it again

### Method 2: Self-Service Unlock Portal

1. Go to https://unlock.example.com
2. Enter your username or email
3. Complete identity verification:
   - Answer security questions
   - Verify via SMS code
   - Use alternate email confirmation
4. Click "Unlock My Account"
5. Wait 5 minutes
6. Try logging in

### Method 3: IT Support Unlock Request

**Email Request:**
```
To: itsupport@example.com
Subject: Account Unlock Request - [Your Name]

Hello,

My account is locked and I need immediate access.

Name: John Smith
Username: jsmith
Employee ID: 12345
Phone: (555) 123-4567
Department: Marketing

Reason: Too many failed login attempts
Business Impact: Cannot access customer emails

Thank you,
John Smith
```

**Phone Request:**
- Call: 1-800-IT-SUPPORT
- Verify identity with employee ID and last 4 of SSN
- Request immediate unlock
- IT can unlock within 5 minutes

## Preventing Account Lockouts

### Password Best Practices

1. **Use Password Manager**
   - Recommended: LastPass, 1Password, Bitwarden
   - Stores passwords securely
   - Auto-fills login forms
   - Prevents typos

2. **Write Down Password Temporarily**
   - When first changing password
   - Keep in secure location (not on sticky note on monitor!)
   - Destroy after memorizing

3. **Test New Password Immediately**
   - After changing password, log out
   - Log in again to verify
   - Test on phone and computer
   - Prevents lockout from typo in password change

### Multi-Device Considerations

**Problem:** Password saved on one device locks account
- Old password saved in phone mail app
- Laptop auto-login with expired password
- VPN client with cached old credentials

**Solution:**
1. Change password
2. Immediately update ALL devices:
   - Computer email client
   - Phone mail app
   - Tablet
   - VPN client
   - Any saved browser passwords
3. Test each device after updating

### Monitoring Login Attempts

1. Check recent activity: https://myaccount.example.com/activity
2. Review devices and locations
3. Sign out unused sessions
4. Report suspicious logins immediately

## Special Lockout Scenarios

### Locked Out After Password Change

**Cause:** Old password cached somewhere

**Solution:**
1. Wait 30 minutes for auto-unlock
2. Clear all browser caches
3. Update password everywhere:
   - Email clients (Outlook, Mail app)
   - Phone email account
   - VPN client
   - Saved browser credentials
   - Mobile apps
4. Restart all devices
5. Sign in with new password

### Locked Out While On Vacation

**Cause:** Password expired while away

**Solution:**
1. Use self-service password reset: https://passwordreset.example.com
2. Create new password meeting requirements
3. If portal doesn't work, call IT: 1-800-IT-SUPPORT
4. Provide alternate contact info for verification
5. IT can reset and unlock remotely

### Locked Out After Return from Leave

**Cause:** Account deactivated for inactivity

**Solution:**
1. Contact IT Support immediately
2. Provide:
   - Return to work date
   - HR confirmation if needed
   - Manager approval
3. IT will reactivate account (usually within 1 hour)
4. May need to create new password
5. Reconfigure MFA

### Locked Out Due to Suspicious Activity

**Symptoms:**
- Locked even with correct password
- "Suspicious activity detected" message
- Multiple MFA requests you didn't initiate

**Immediate Actions:**
1. Call IT Security: 1-800-IT-SEC-URGENT
2. Do NOT attempt to unlock yourself
3. Report all suspicious emails or access attempts
4. IT will investigate and unlock after verification
5. May require password change and MFA reset

## Account Access After Termination or Role Change

### Department Transfer

- Old access removed within 24 hours
- New access provisioned by manager request
- Temporary lockout possible during transition
- Contact new manager and IT

### Contractor to Employee Conversion

- New employee account created
- Old contractor account disabled
- Cannot reuse contractor credentials
- HR provides new account information

### Returning from Extended Leave

- Account may be disabled after 60 days
- HR must authorize reactivation
- Submit return-to-work documentation
- IT reactivates within 24 hours of HR approval

## MFA-Related Lockouts

### Lost or Broken MFA Device

1. Use backup codes (if you saved them)
2. Call IT Support with phone identity verification
3. IT can temporarily bypass MFA
4. Set up new MFA device immediately
5. Generate new backup codes

### MFA App Not Working

1. Check phone date/time is correct
2. Re-sync authenticator app
3. Try backup authentication method (SMS, call)
4. Use backup code
5. Contact IT if all methods fail

### Constant MFA Prompts Locking Account

**Cause:** Someone trying to access your account

**Action:**
1. STOP approving MFA requests
2. Call IT Security immediately: 1-800-IT-SEC-URGENT
3. Change password ASAP
4. Review recent account activity
5. Report to security@example.com

## Emergency Access Procedures

### Critical Business Need

If you're locked out and have urgent business need:

1. **Call IT Priority Support: 1-800-IT-URGENT**
2. **Explain business impact:**
   - Customer deadline
   - Executive meeting
   - Critical system access needed
3. **Provide verification:**
   - Manager name and contact
   - Employee ID
   - Last 4 of SSN or employee badge number
4. **Priority unlock:** Usually within 15 minutes

### After Hours Lockout

- Call 24/7 support: 1-800-IT-SUPPORT
- For emergencies only (on-call costs apply)
- Must verify identity thoroughly
- Manager approval may be required

## Checking Account Status

### Self-Service Status Check

1. Visit https://myaccount.example.com
2. Login with valid credentials
3. View "Account Status" section:
   - Active/Locked/Disabled
   - Last login date/time
   - Password expiration date
   - Recent activity

### IT Support Status Verification

Email IT with:
- Your username
- "Please confirm my account status"
- IT will respond within 1 business hour

## Related Issues and Solutions

### "Your password has expired"

Not technically a lockout. Follow password reset process at https://passwordreset.example.com

### "Account not found"

Indicates account doesn't exist or severe issue. Contact IT immediately.

### "Access denied"

Different from lockout. May be permissions issue. Check with manager about access rights.

## Support Resources

### Immediate Help

- **Self-Service Unlock:** https://unlock.example.com
- **Password Reset:** https://passwordreset.example.com
- **24/7 Phone Support:** 1-800-IT-SUPPORT
- **Emergency Security:** 1-800-IT-SEC-URGENT

### Documentation

- Password Policy: https://policy.example.com/passwords
- Security Guidelines: https://policy.example.com/security
- MFA Setup Guide: https://support.example.com/mfa

### Training

- Account Security Workshop (monthly)
- Password Manager Training (on-demand)
- Security Awareness Course (annual required)

## Preventing Future Lockouts

1. ✓ Use password manager
2. ✓ Set calendar reminder for password expiration (every 80 days)
3. ✓ Keep MFA device accessible
4. ✓ Save backup codes securely
5. ✓ Update all devices when changing password
6. ✓ Report suspicious activity immediately
7. ✓ Complete security training annually
8. ✓ Review account activity monthly
