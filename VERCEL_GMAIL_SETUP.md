# Gmail Integration on Vercel - Setup Guide

## Why It Works on Localhost But Not on Vercel

The most common reason is **missing environment variables** on Vercel.

## Quick Fix Checklist

### 1. ✅ Add Environment Variables to Vercel

**Go to Vercel Dashboard:**
1. Visit: https://vercel.com/dashboard
2. Select your project (`nmPLOS`)
3. Go to **Settings** → **Environment Variables**
4. Add these variables (if not already added):

```
GOOGLE_OAUTH_CLIENT_ID=your-client-id-here
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret-here
```

**Important:**
- Make sure to add them to **Production**, **Preview**, AND **Development** environments
- Use the same values from your `.env.local` file
- Click "Save" after adding each variable

### 2. ✅ Redeploy After Adding Environment Variables

**After adding environment variables:**
1. Go to **Deployments** tab in Vercel
2. Click the three dots (`...`) on the latest deployment
3. Click **"Redeploy"**
4. OR make a new commit and push to trigger a new deployment

**Why?** Environment variables are only loaded when a deployment is created. Existing deployments won't have access to newly added variables.

### 3. ✅ Verify Redirect URIs in Google Cloud Console

**Go to Google Cloud Console:**
1. Visit: https://console.cloud.google.com/apis/credentials
2. Click edit (pencil icon) on your Gmail OAuth client
3. **Authorized redirect URIs** should have:
   ```
   https://nmplos.vercel.app/api/gmail/callback
   http://localhost:3001/api/gmail/callback
   ```
4. **Authorized JavaScript origins** should have:
   ```
   https://nmplos.vercel.app
   http://localhost:3001
   ```
5. Click **"Save"**
6. **Wait 2-3 minutes** for changes to propagate

### 4. ✅ Check Vercel Function Logs

**If it still doesn't work:**
1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Click **"Functions"** tab
4. Click on `/api/gmail/auth`
5. Check the logs for error messages
6. Look for clues like:
   - "Missing environment variables"
   - "redirect_uri_mismatch"
   - Any other errors

## Common Errors on Vercel

### Error: "Connection failed"

**Cause:** Missing environment variables or they're not loaded in the deployment.

**Fix:**
1. Verify environment variables are added in Vercel Dashboard
2. Make sure they're added to all environments (Production, Preview, Development)
3. **Redeploy** after adding variables
4. Check Function logs for specific error

### Error: "redirect_uri_mismatch"

**Cause:** The redirect URI in Google Cloud Console doesn't match what Vercel is sending.

**Fix:**
1. Make sure `https://nmplos.vercel.app/api/gmail/callback` is in Google Cloud Console
2. Check that the URL matches **exactly** (no trailing slash, correct protocol)
3. Wait 2-3 minutes after saving

### Error: "Google OAuth credentials not configured"

**Cause:** Environment variables are not set or not accessible.

**Fix:**
1. Double-check variable names are **exactly**:
   - `GOOGLE_OAUTH_CLIENT_ID` (not `GOOGLE_CLIENT_ID` or similar)
   - `GOOGLE_OAUTH_CLIENT_SECRET` (not `GOOGLE_CLIENT_SECRET` or similar)
2. Make sure they're added to the correct project
3. Redeploy after adding

## Step-by-Step Vercel Environment Setup

### Step 1: Get Your OAuth Credentials

From your `.env.local` file, copy:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

### Step 2: Add to Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project
3. **Settings** → **Environment Variables**
4. Click **"Add New"**
5. For each variable:
   - **Key:** `GOOGLE_OAUTH_CLIENT_ID`
   - **Value:** (paste your client ID)
   - **Environment:** Select all (Production, Preview, Development)
   - Click **"Save"**
6. Repeat for `GOOGLE_OAUTH_CLIENT_SECRET`

### Step 3: Redeploy

**Option A: Redeploy existing deployment**
- Deployments → Latest → Three dots → Redeploy

**Option B: Trigger new deployment**
- Make a small commit and push (or just push the current code)

### Step 4: Test

1. Wait for deployment to finish
2. Go to `https://nmplos.vercel.app/gmail`
3. Click "Connect Gmail"
4. Should redirect to Google OAuth

## Still Not Working?

1. **Check Vercel Function Logs** - They'll show the exact error
2. **Compare with localhost** - What's different?
   - Environment variables?
   - Redirect URI configuration?
3. **Test the API directly:**
   - Visit: `https://nmplos.vercel.app/api/gmail/auth?userId=YOUR_USER_ID`
   - Should return JSON with `authUrl` or an error
   - Check the error message for clues

## Debugging Tips

The code now logs more detailed errors. Check:
- Vercel Dashboard → Deployments → Functions → `/api/gmail/auth` → Logs
- Look for messages like:
  - "Missing environment variables: GOOGLE_OAUTH_CLIENT_ID"
  - "OAuth Debug:" with origin, appUrl, redirectUri info

