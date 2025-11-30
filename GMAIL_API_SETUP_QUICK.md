# Gmail API Setup - Quick Reference

## Do you need to enable Gmail API anywhere else?

**NO** - You only need to enable it in **Google Cloud Console**. Nothing else is required!

### What's Already Done in the Code:
- ✅ The code uses the `googleapis` npm package (already installed)
- ✅ OAuth 2.0 authentication is configured
- ✅ Gmail API client is initialized automatically when you use `google.gmail({ version: "v1", auth: oauth2Client })`

### What You Need to Do:
1. **Enable Gmail API in Google Cloud Console** (if not already done):
   - Go to: https://console.cloud.google.com/
   - Navigate to: "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"
   
2. **That's it!** No code changes needed. The Gmail API is automatically used when you call `google.gmail()`.

## How It Works:
- When your code calls `google.gmail({ version: "v1", auth: oauth2Client })`, the `googleapis` library automatically uses the Gmail API
- The OAuth tokens you get from Google already have the `gmail.readonly` scope
- As long as Gmail API is enabled in your Google Cloud project, everything works!

## Troubleshooting:
If you get errors, check:
1. ✅ Gmail API is enabled in Google Cloud Console
2. ✅ OAuth consent screen has `gmail.readonly` scope
3. ✅ OAuth credentials (Client ID/Secret) are correct in `.env.local`
4. ✅ User has granted permission during OAuth flow

