# Sample Support Tickets

This file contains 20 realistic support tickets for testing the Smart Support Assistant. Each ticket includes the expected **category**, **priority**, and **recommended action** for evaluation purposes.

---

## Ticket 1: Password Reset Fails

**Text:**
```
I've tried resetting my password three times using the self-service portal, but I never receive the email. I checked spam and it's not there either. My email is user123@example.com. I need access urgently for a client presentation this afternoon.
```

**Expected:**
- **Category**: Account
- **Priority**: High
- **Action**: Auto-reply with password reset troubleshooting steps; create ticket

---

## Ticket 2: VPN Disconnects Frequently

**Text:**
```
The VPN connection drops every 5-10 minutes. I've restarted my laptop and tried different Wi-Fi networks but the issue persists. This is making it impossible to work remotely.
```

**Expected:**
- **Category**: Technical
- **Priority**: Medium
- **Action**: Auto-reply with VPN troubleshooting guide from KB; create ticket

---

## Ticket 3: Duplicate Charge on Credit Card

**Text:**
```
I was charged twice for order #45678. My card ending in 1234 shows two transactions of $99.99 on Nov 8. Please refund the duplicate charge immediately.
```

**Expected:**
- **Category**: Billing
- **Priority**: High
- **Action**: Call getOrderStatus(45678); create ticket; escalate to billing team

---

## Ticket 4: Cannot Access SharePoint Site

**Text:**
```
When I try to open https://contoso.sharepoint.com/sites/finance, I get "Access Denied - You need permission to access this site." I was able to access it last week without issues.
```

**Expected:**
- **Category**: Access
- **Priority**: High
- **Action**: Auto-reply with access request instructions; create ticket for permissions team

---

## Ticket 5: License Upgrade Request

**Text:**
```
I need to upgrade from the Basic plan to Premium. What's the pricing and how long does it take to activate?
```

**Expected:**
- **Category**: Billing
- **Priority**: Medium
- **Action**: If pricing in KB, auto-reply; else forward to sales team

---

## Ticket 6: Security Incident - Phishing Email

**Text:**
```
I received a suspicious email claiming to be from IT asking me to verify my credentials. The link is http://fakephishing.com/verify. I did NOT click it. Is this a known phishing attempt?
```

**Expected:**
- **Category**: Technical
- **Priority**: High
- **Action**: Auto-reply thanking user; create HIGH priority ticket; alert security team

---

## Ticket 7: Multi-Factor Authentication Setup

**Text:**
```
How do I set up MFA for my account? I got an email saying it's required starting next week but I don't see where to configure it.
```

**Expected:**
- **Category**: Account
- **Priority**: Medium
- **Action**: Auto-reply with MFA setup guide from KB; create ticket

---

## Ticket 8: Refund Policy Question

**Text:**
```
What's your refund policy for cancelled orders? I cancelled order #78901 yesterday and want to know when I'll get my money back.
```

**Expected:**
- **Category**: Billing
- **Priority**: Medium
- **Action**: Auto-reply with refund policy from KB; call getOrderStatus(78901); create ticket

---

## Ticket 9: Application Outage

**Text:**
```
The CRM application has been down for 30 minutes. All users in our department are affected. We can't access customer records. THIS IS CRITICAL.
```

**Expected:**
- **Category**: Technical
- **Priority**: High
- **Action**: Create HIGH priority ticket; escalate to incident management; auto-reply with status page link

---

## Ticket 10: Printer Driver Installation

**Text:**
```
I need to install the driver for the HP LaserJet 4000 in Building A, 3rd floor. The printer shows up but won't print.
```

**Expected:**
- **Category**: Technical
- **Priority**: Low
- **Action**: Auto-reply with printer setup guide; create ticket

---

## Ticket 11: Order Status Inquiry

**Text:**
```
Where is my order #12345? I ordered it 5 days ago and the tracking hasn't updated.
```

**Expected:**
- **Category**: Technical (or Billing)
- **Priority**: Medium
- **Action**: Call getOrderStatus(12345); auto-reply with status and ETA

---

## Ticket 12: Account Locked After Failed Logins

**Text:**
```
My account is locked after I mistyped my password too many times. I can't log in to any company systems. Please unlock it ASAP.
```

**Expected:**
- **Category**: Account
- **Priority**: High
- **Action**: Auto-reply with account unlock instructions; create ticket for identity team

---

## Ticket 13: Data Privacy Request (GDPR)

**Text:**
```
Under GDPR, I request a copy of all personal data you have stored about me. My email is gdpr_user@example.com.
```

**Expected:**
- **Category**: Account
- **Priority**: High
- **Action**: Create ticket; escalate to legal/compliance team (manual review required)

---

## Ticket 14: Software License Activation

**Text:**
```
I installed Adobe Creative Cloud but it's asking for a license key. Where do I find the key assigned to my account?
```

**Expected:**
- **Category**: Technical
- **Priority**: Medium
- **Action**: Auto-reply with software license instructions from KB; create ticket

---

## Ticket 15: Expense Report Approval Delay

**Text:**
```
My expense report from Oct 15 is still pending approval. It's been 3 weeks. Who do I contact to escalate this?
```

**Expected:**
- **Category**: Technical (or Other)
- **Priority**: Medium
- **Action**: Forward to HR/Finance team (out of scope for L1 support)

---

## Ticket 16: Mobile App Crash on iOS

**Text:**
```
The company mobile app crashes immediately after I log in on my iPhone 15. I've tried uninstalling and reinstalling but it still crashes.
```

**Expected:**
- **Category**: Technical
- **Priority**: Medium
- **Action**: Auto-reply with mobile app troubleshooting; create ticket for app dev team

---

## Ticket 17: Email Not Sending (Exchange Error)

**Text:**
```
I keep getting "Email delivery failed" errors when sending to external addresses. Emails to internal users work fine. Error code: 550 5.7.1.
```

**Expected:**
- **Category**: Technical
- **Priority**: High
- **Action**: Auto-reply with email troubleshooting; create ticket; escalate to email admin

---

## Ticket 18: New Hire Onboarding - Access Setup

**Text:**
```
I'm a new employee starting Monday. I need access to: email, SharePoint, CRM, and expense system. My manager is Jane Doe.
```

**Expected:**
- **Category**: Access
- **Priority**: High
- **Action**: Create ticket; forward to onboarding team with manager CC

---

## Ticket 19: General Feedback - No Issue

**Text:**
```
Just wanted to say the new support portal is great! Much easier to find answers than the old system.
```

**Expected:**
- **Category**: Technical (or Other)
- **Priority**: Low
- **Action**: Thank you message; optionally create feedback ticket for product team

---

## Ticket 20: Unclear Issue - Needs Clarification

**Text:**
```
The thing isn't working. Please fix it.
```

**Expected:**
- **Category**: Technical (default)
- **Priority**: Medium
- **Action**: Forward to human for clarification (confidence < 0.7)

---

## Usage for Testing

### Triage Evaluation

Run all 20 tickets through the triage flow:

```bash
pf flow test -f demos/01-triage-promptflow/flow.dag.yaml -d sample-data/tickets.jsonl
```

**Success criteria:**
- ≥90% correct category
- ≥85% correct priority
- 100% valid JSON output

### RAG Testing

Convert tickets into questions and test against KB:

- Ticket 1 → "How do I reset my password?"
- Ticket 2 → "How to fix VPN disconnects?"
- Ticket 4 → "How to request SharePoint access?"

**Success criteria:**
- Answer found in KB: cite source with [1]
- Answer NOT in KB: respond "I do not know"

### Tool Calling Testing

Test agent with order status queries:

- "Where is order 12345?" → Call getOrderStatus(12345)
- "Create a ticket for VPN disconnects" → Call createTicket(...)

**Success criteria:**
- Correct tool selected
- Parameters extracted accurately
- Final answer includes tool results

### Orchestration Testing

Send test emails with [Support] subject using tickets above:

**High-confidence auto-reply expected:**
- Ticket 1, 2, 4, 7, 8, 10, 11

**Forward to human expected:**
- Ticket 13 (GDPR - legal review)
- Ticket 15 (out of scope)
- Ticket 18 (requires manager approval)
- Ticket 20 (unclear)

---

**Document Owner**: QA & Testing Team  
**Last Updated**: November 9, 2025  
**Usage**: Evaluation, CI/CD testing, demo scenarios
