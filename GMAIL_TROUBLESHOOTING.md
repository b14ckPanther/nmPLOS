# Gmail Integration Troubleshooting Guide

## Issue: "Something went wrong. Please try again"

This error usually means there's a mismatch between the redirect URI in your code and what's configured in Google Cloud Console.

### Fix Steps:

#### 1. **Check Your Current URL**
   - Are you testing on `localhost:3001` or `nmplos.vercel.app`?
   - The redirect URI must match EXACTLY

#### 2. **Verify Google Cloud Console Settings - CRITICAL!**

   Go to: https://console.cloud.google.com/apis/credentials

   1. Click the edit (pencil) icon on "nmPLOS Gmail Integration"
   
   2. **"Authorized redirect URIs" - MUST have BOTH:**
      - ✅ `http://localhost:3001/api/gmail/callback` (for local testing)
      - ✅ `https://nmplos.vercel.app/api/gmail/callback` (for Vercel)
      
      **If you only see the Vercel one, ADD the localhost one!**
      - Click "+ Add URI"
      - Type: `http://localhost:3001/api/gmail/callback`
      - Click "Add URI" again for: `http://127.0.0.1:3001/api/gmail/callback` (optional but recommended)
   
   3. **"Authorized JavaScript origins" - MUST have BOTH:**
      - ✅ `http://localhost:3001`
      - ✅ `https://nmplos.vercel.app`
      
      **If missing, add the localhost one:**
      - Click "+ Add URI"
      - Type: `http://localhost:3001`
   
   4. **Click "Save"** - Wait 1-2 minutes for changes to propagate
   
   **Common Mistake:** Only having the Vercel URL causes `redirect_uri_mismatch` when testing on localhost!

#### 3. **Switch to Testing Mode (For Development)**

   **IMPORTANT:** If your app is "In production" mode, switch it back to testing for easier development:
   
   Go to: https://console.cloud.google.com/apis/credentials/consent

   1. Find "Publishing status" section
   2. Click "Back to testing" button
   3. Confirm the change
   
   **Then add test users:**
   1. Scroll to "Test users" section
   2. Click "+ ADD USERS"
   3. Add your Gmail email address
   4. Click "Add" and "Save"
   
   **Why?** 
   - Testing mode: Unlimited test users, no verification needed
   - Production mode: Limited to 100 users, requires verification for wider use

#### 4. **Verify Environment Variables**

   **For Local Development (.env.local):**
   ```env
   GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
   ```

   **For Vercel (Dashboard → Settings → Environment Variables):**
   - Add the same variables above
   - Make sure they're added to Production, Preview, AND Development environments
   - Redeploy after adding

#### 5. **Clear Browser Cache**

   - Clear cookies for `accounts.google.com`
   - Or try in an incognito/private window

## Common Errors:

### Error: `redirect_uri_mismatch`
- **Cause:** The redirect URI in your code doesn't match Google Cloud Console
- **Fix:** Add the exact URL (with protocol, domain, and path) to "Authorized redirect URIs"

### Error: `Access blocked: This app's request is invalid`
- **Cause:** App not verified + you're not a test user
- **Fix:** Add yourself as a test user in OAuth consent screen

### Error: `Something went wrong`
- **Cause:** Usually redirect URI mismatch or missing environment variables
- **Fix:** Follow steps 1-4 above

## Testing Checklist:

- [ ] Added redirect URI to Google Cloud Console
- [ ] Added JavaScript origin to Google Cloud Console
- [ ] Added test user email to OAuth consent screen
- [ ] Environment variables set in `.env.local` (local) or Vercel (production)
- [ ] Restarted dev server after changing `.env.local`
- [ ] Redeployed on Vercel after adding environment variables
- [ ] Using the correct URL (localhost vs Vercel)

