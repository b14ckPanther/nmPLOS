# Quick Fix: redirect_uri_mismatch Error

## The Problem
Error shows: `redirect_uri=http://localhost:3001/api/gmail/callback`
This URI is NOT in your Google Cloud Console authorized redirect URIs.

## Exact Steps to Fix (Copy-Paste Ready)

### 1. Go to Google Cloud Console
https://console.cloud.google.com/apis/credentials

### 2. Edit Your OAuth Client
- Click edit (pencil) icon on "nmPLOS Gmail Integration"

### 3. Copy-Paste These EXACT URLs:

**Authorized redirect URIs:**
```
http://localhost:3001/api/gmail/callback
http://127.0.0.1:3001/api/gmail/callback
https://nmplos.vercel.app/api/gmail/callback
```

**Authorized JavaScript origins:**
```
http://localhost:3001
http://127.0.0.1:3001
https://nmplos.vercel.app
```

### 4. Save and Wait
- Click "Save"
- Wait 2 minutes

### 5. Clear Cache & Retry
- Clear browser cache OR use incognito window
- Try connecting Gmail again

## Important Notes:
- URLs are case-sensitive
- Must include `http://` or `https://`
- No trailing slashes
- Port number must match (3001 in your case)

