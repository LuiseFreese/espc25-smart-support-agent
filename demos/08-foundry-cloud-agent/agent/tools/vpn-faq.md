# VPN Frequently Asked Questions

## Connection Issues

### Q: Why does my VPN keep disconnecting?
**A:** Common causes include:
- **Network switching** — Moving between WiFi networks or WiFi to cellular
- **Firewall rules** — Corporate firewalls may block VPN after timeout
- **Session timeouts** — Default timeout is 30 minutes of inactivity
- **DNS conflicts** — Local DNS may override VPN DNS settings

**Solutions:**
1. Enable "Auto-reconnect" in VPN settings
2. Increase session timeout in VPN client preferences
3. Disable firewall temporarily to test
4. Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

### Q: How do I reconnect after a disconnect?
**A:** 
1. Click the VPN icon in system tray (Windows) or menu bar (Mac)
2. Select "Connect" or click your profile name
3. If connection fails, try:
   - Restart the VPN client application
   - Restart your computer
   - Contact IT support if issue persists

### Q: What if I can't connect at all?
**A:** Troubleshooting steps:
1. **Check internet connection** — Open browser, visit google.com
2. **Verify credentials** — Ensure username/password are correct
3. **Check VPN server status** — Visit status.contoso.com
4. **Update VPN client** — Download latest version from portal.contoso.com/vpn
5. **Check firewall** — Ensure ports 1194 (UDP) and 443 (TCP) are open

## Performance Issues

### Q: Why is my VPN connection slow?
**A:** VPN performance depends on several factors:
- **Server location** — Connect to nearest geographic server
- **Server load** — Switch to different server if current one is overloaded
- **Encryption overhead** — VPN adds ~10-20% latency by design
- **ISP throttling** — Some ISPs limit VPN traffic

**To improve speed:**
1. Select fastest server in VPN client (usually auto-selected)
2. Use wired connection instead of WiFi
3. Close bandwidth-intensive applications
4. Switch to "Performance" mode in VPN settings (if available)

### Q: Can I use split tunneling?
**A:** Split tunneling allows some traffic to bypass VPN:
- **Enabled by default** for Contoso employees
- **Configuration**: VPN Settings → Advanced → Split Tunneling
- **Recommended**: Enable split tunneling for streaming/personal browsing
- **Security note**: Corporate resources always route through VPN regardless of setting

## Setup & Installation

### Q: How do I install the VPN client?
**A:** Installation steps:
1. Visit [portal.contoso.com/vpn](https://portal.contoso.com/vpn)
2. Sign in with company credentials
3. Download installer for your OS (Windows, Mac, Linux, iOS, Android)
4. Run installer with admin privileges
5. Launch VPN client and sign in
6. Connect to recommended server

### Q: Do I need admin rights to install VPN?
**A:** 
- **Windows/Mac**: Yes, admin rights required for initial installation
- **Mobile (iOS/Android)**: No admin rights needed
- **Alternative**: Request IT to pre-install via MDM (Mobile Device Management)

### Q: How do I configure VPN on mobile?
**A:** Mobile setup:
1. Download "Contoso VPN" app from App Store or Google Play
2. Open app and tap "Sign In"
3. Enter company email and password
4. Enable VPN profile when prompted (iOS only)
5. Tap "Connect" to establish VPN connection

## Security & Access

### Q: Is my VPN connection secure?
**A:** Yes, Contoso VPN uses:
- **AES-256 encryption** for all traffic
- **Multi-factor authentication (MFA)** required for connection
- **Zero-knowledge architecture** — Contoso cannot see your traffic
- **Kill switch** — Blocks internet if VPN drops (optional, enable in settings)

### Q: Can I access all internal resources over VPN?
**A:** Access depends on your role:
- **All employees**: Email, Teams, SharePoint, HR portal
- **Engineering**: Development servers, source code repositories
- **Finance**: QuickBooks, financial databases
- **Contact IT** if you need access to specific resource

### Q: What if VPN is required but I'm traveling?
**A:** VPN works globally:
- **Available in 50+ countries** with local servers
- **China users**: Use "Stealth Mode" in VPN settings (bypasses firewall)
- **Restricted regions**: Contact IT for special configuration
- **Mobile hotspot**: VPN works over cellular data

## Troubleshooting Commands

### Windows
```cmd
# Check VPN connection status
ipconfig /all | findstr "VPN"

# Flush DNS cache
ipconfig /flushdns

# Reset network adapter
netsh winsock reset
netsh int ip reset
```

### Mac
```bash
# Check VPN status
scutil --nc status "Contoso VPN"

# Flush DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Restart VPN service
sudo launchctl unload /Library/LaunchDaemons/com.contoso.vpn.plist
sudo launchctl load /Library/LaunchDaemons/com.contoso.vpn.plist
```

## Support Contact
- **Email**: vpn-support@contoso.com
- **Phone**: 1-800-CONTOSO ext. 4
- **Chat**: portal.contoso.com/support (Mon-Fri 9AM-5PM EST)
- **Emergency**: 24/7 hotline for critical VPN outages
