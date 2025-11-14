# Email and Calendar Support

## Email Issues

### Cannot Send or Receive Emails
If you're having trouble with email:

1. **Check your internet connection** - Make sure you're connected to the network
2. **Verify mailbox isn't full** - Check your mailbox storage limit
3. **Check Outlook connection status** - Look for "Disconnected" or "Working Offline" at the bottom
4. **Restart Outlook** - Close completely and reopen
5. **Clear Outlook cache** - File > Account Settings > Account Settings > Data Files > Open File Location, then delete .ost file (will rebuild)

### Mailbox Full
Your mailbox has a 50GB limit. To free up space:
- Empty Deleted Items folder (right-click > Empty Folder)
- Archive old emails (File > Tools > Clean Up Mailbox)
- Delete large attachments (search for size:>10MB)
- Move emails to Personal Folders (.pst file) for long-term storage
- Request mailbox size increase if needed for business purposes

### Missing Emails
If emails are missing:
- Check Deleted Items folder
- Check Junk Email folder (right-click sender > Never Block Sender)
- Check email rules (File > Rules > Manage Rules & Alerts)
- Search using Advanced Find (Ctrl+Shift+F)
- Contact IT if emails were accidentally deleted - we can recover from backup within 14 days

### Email Stuck in Outbox
To fix stuck emails:
1. Switch to Work Offline mode (Send/Receive tab)
2. Delete the stuck email from Outbox
3. Switch back to online mode
4. Recreate and send the email
5. If issue persists, check attachment size (max 25MB) or contact IT

## Calendar Problems

### Meeting Invites Not Sending
Common fixes:
- Verify attendee email addresses are correct
- Check if you have delegate access to send on behalf of someone
- Ensure calendar permissions are set correctly
- Try sending as ICS attachment instead
- Contact IT if recurring issue

### Cannot See Shared Calendar
To access a colleague's calendar:
1. Click Calendar icon in Outlook
2. Home tab > Open Calendar > From Address Book
3. Type colleague's name and click OK
4. If still can't see: they need to grant you permission
   - They go to Calendar > Properties > Permissions tab > Add your name > Select permission level

### Calendar Sync Issues (Phone)
If calendar not syncing to mobile:
- Remove and re-add email account on phone
- Check ActiveSync is enabled (Settings > Account > More Settings)
- Ensure phone allows background data sync
- Try Outlook mobile app instead of default calendar
- Contact IT if sync still fails

### Double-Booked Meetings
To avoid scheduling conflicts:
- Enable "Show As" setting for all meetings
- Check attendee availability before sending invite
- Set working hours in Outlook (File > Options > Calendar)
- Use Scheduling Assistant when creating meetings
- Set up automatic decline for conflicting meetings

## Distribution Lists and Groups

### Adding to Distribution List
To join a distribution list:
- Email IT with: list name, business justification, manager approval
- We'll add you within 4 business hours
- Some lists are auto-populated based on department or role

### Creating New Distribution List
Requirements:
- Minimum 5 members
- Clear business purpose
- Manager approval
- Proposed list name and members
- Email IT with request - setup within 2 business days

### Group Mailbox Access
For shared/group mailboxes:
- Request access from IT with business justification
- Specify if you need Send As or Send on Behalf permissions
- Access granted within 1 business day
- Shared mailboxes don't require separate license

## Email Rules and Automation

### Setting Up Email Rules
Create rules to auto-organize emails:
1. Right-click an email > Rules > Create Rule
2. Specify conditions (from, subject, keywords)
3. Choose action (move to folder, flag, forward, etc.)
4. Test rule on existing emails first
5. Max 256 rules per mailbox

### Out of Office / Automatic Replies
To set up auto-reply:
1. File > Automatic Replies
2. Select "Send automatic replies"
3. Set date range if needed
4. Write message for internal and external senders
5. Click OK - replies send automatically

### Email Forwarding
To forward all emails to another address:
- File > Account Settings > Account Settings
- Select account > Rules & Alerts > Email Rules > New Rule
- Apply to all messages > Forward to specific address
- Note: External forwarding blocked for security - contact IT if needed

## Spam and Phishing

### Reporting Phishing Emails
If you receive a suspicious email:
1. Don't click any links or download attachments
2. Don't reply or provide any information
3. Use "Report Message" button in Outlook (Report Phishing)
4. Forward to security@company.com
5. Delete the email
6. Contact IT if you clicked a link or provided credentials

### Email in Junk Folder
To prevent legitimate emails from going to junk:
- Right-click sender > Junk > Never Block Sender
- Add sender to Safe Senders list (Home > Junk > Junk Email Options)
- Create inbox rule to move specific emails
- Contact IT if company emails going to junk (possible mail server issue)

## Troubleshooting Tips

### Outlook Performance Issues
If Outlook is slow:
- Close unnecessary windows and emails
- Reduce mailbox size (archive old emails)
- Disable unnecessary add-ins (File > Options > Add-ins)
- Run Outlook in Safe Mode (hold Ctrl while starting)
- Compact data file (File > Account Settings > Data Files > Settings > Compact Now)
- Contact IT for mailbox optimization

### Connection Errors
"Cannot connect to Exchange server" error:
- Check VPN connection if working remotely
- Verify network connectivity
- Restart Outlook
- Check if Exchange server is down (check company status page)
- Try webmail (Outlook Web Access) as alternative
- Contact IT if issue persists beyond 30 minutes
