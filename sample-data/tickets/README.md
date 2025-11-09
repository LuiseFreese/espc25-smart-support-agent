# Sample Support Tickets

These sample tickets demonstrate the variety of issues the Smart Support Agent can handle.

## Technical Issues

### Ticket 1: VPN Connection
```
Subject: [Support] VPN keeps disconnecting
From: john.doe@example.com
Body:
My VPN connection drops every 5-10 minutes when I work from home. I've tried restarting my computer but the issue persists. This is blocking my work.

Expected Classification: Technical, High
Expected Answer: Should reference VPN troubleshooting guide with specific steps
```

### Ticket 2: Application Crash
```
Subject: [Support] Application crashes on startup
From: jane.smith@example.com
Body:
The desktop application crashes immediately when I try to launch it. Error message says "Application has stopped working". I need this urgently for a client presentation.

Expected Classification: Technical, High
```

### Ticket 3: Slow Performance
```
Subject: [Support] Dashboard loading very slowly
From: mike.johnson@example.com
Body:
The analytics dashboard takes 2-3 minutes to load. This started yesterday. Other pages work fine.

Expected Classification: Technical, Medium
```

## Account Issues

### Ticket 4: Password Reset
```
Subject: [Support] Can't reset my password
From: sarah.wilson@example.com
Body:
I forgot my password and clicked the reset link, but I'm not receiving the email. I checked my spam folder too.

Expected Classification: Account, Medium
Expected Answer: Should reference password reset guide
```

### Ticket 5: Profile Update
```
Subject: [Support] Need to update my email address
From: tom.brown@example.com
Body:
I have a new work email address and need to update it in my profile. Where can I do this?

Expected Classification: Account, Low
```

## Access Issues

### Ticket 6: Permission Request
```
Subject: [Support] Need access to Marketing folder
From: lisa.garcia@example.com
Body:
I need read access to the shared Marketing folder for the Q4 campaign. My manager approved this.

Expected Classification: Access, Medium
```

### Ticket 7: Role Change
```
Subject: [Support] Upgrade to admin role
From: david.martinez@example.com
Body:
Can you upgrade my account to admin role? I need to manage team members for the new project.

Expected Classification: Access, Low
```

## Billing Issues

### Ticket 8: Refund Request
```
Subject: [Support] Duplicate charge on my account
From: emily.anderson@example.com
Body:
I was charged twice for my subscription this month. I need a refund for one of the charges. Invoice #12345 and #12346.

Expected Classification: Billing, Medium
Expected Answer: Should reference refund policy
```

### Ticket 9: Invoice Question
```
Subject: [Support] Where can I download invoices?
From: chris.taylor@example.com
Body:
I need to download invoices for the past 6 months for accounting. How do I access them?

Expected Classification: Billing, Low
Expected Answer: Should reference billing guide
```

### Ticket 10: Payment Method
```
Subject: [Support] Credit card declined
From: amanda.white@example.com
Body:
My payment failed with "card declined" error. The card is valid and has sufficient funds. Please help urgently.

Expected Classification: Billing, High
```

## Order Status Queries

### Ticket 11: Order Tracking
```
Subject: [Support] Where is my order?
From: robert.harris@example.com
Body:
I placed order #12345 a week ago but haven't received it yet. Can you check the status?

Expected Action: Agent should call getOrderStatus tool
Expected Answer: Order is in transit, ETA Nov 15, tracking TRK-98765-ABCD
```

### Ticket 12: Delivery Delay
```
Subject: [Support] Order delayed?
From: jennifer.clark@example.com
Body:
My order #67890 was supposed to arrive yesterday but I haven't received it. Is there a delay?

Expected Action: Agent should call getOrderStatus tool
Expected Answer: Order was delivered on Nov 10
```

## Complex Multi-Step Issues

### Ticket 13: VPN + Order Status
```
Subject: [Support] Multiple issues
From: kevin.lewis@example.com
Body:
1. My VPN keeps disconnecting (same issue as last week)
2. Can you check on order #11111?
3. I also need access to the Sales dashboard

Expected Actions: 
- Call getOrderStatus for order
- Reference VPN guide
- Create ticket for access request
```

### Ticket 14: Escalation Required
```
Subject: [Support] URGENT: Data loss incident
From: michelle.walker@example.com
Body:
We've lost data from our database. Multiple team members affected. This is a critical production issue affecting customers.

Expected Classification: Technical, High
Expected Action: Should escalate to human immediately
```
