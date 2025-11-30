# Fix: Firebase Google Sign-In "redirect_uri_mismatch" Error

## The Problem
Error: **"Access blocked: This app's request is invalid"** with `Error 400: redirect_uri_mismatch`

This happens because Firebase Authentication uses its own OAuth client, and the redirect URIs need to be configured.

## Quick Fix Steps

### Step 1: Find Firebase's OAuth Client in Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Make sure you're in the **same project** as your Firebase project

2. **Find Firebase's OAuth Client**
   - Go to: "APIs & Services" > "Credentials"
   - Look for an OAuth 2.0 Client ID that says something like:
     - `Web client (auto created by Google Service)`
     - Or shows your Firebase project name
     - Usually starts with your Firebase project ID

3. **If you can't find it, Firebase creates it automatically. Check:**
   - Firebase Console > Authentication > Sign-in method > Google
   - Make sure Google sign-in is enabled
   - The OAuth client is created automatically in Google Cloud Console

### Step 2: Add Redirect URIs

1. **Click the edit (pencil) icon** on Firebase's OAuth client

2. **Add these EXACT redirect URIs** (click "+ Add URI" for each):
   ```
   http://localhost:3001/__/auth/handler
   http://127.0.0.1:3001/__/auth/handler
   https://nmplos.vercel.app/__/auth/handler
   ```

3. **Add these JavaScript origins** (click "+ Add URI" for each):
   ```
   http://localhost:3001
   http://127.0.0.1:3001
   https://nmplos.vercel.app
   ```

4. **Click "Save"**

5. **Wait 2-3 minutes** for changes to propagate

### Step 3: Verify Firebase Authorized Domains

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project

2. **Go to Authentication > Settings**
   - Click the "Settings" tab (gear icon)

3. **Check "Authorized domains"**
   - Should include:
     - ✅ `localhost`
     - ✅ `127.0.0.1`
     - ✅ `nmplos.vercel.app` (your production domain)

4. **If missing, add them:**
   - Click "Add domain"
   - Type: `127.0.0.1`
   - Click "Add"
   - Repeat for `localhost` if needed

### Step 4: Test Again

1. **Clear browser cache** or use **incognito window**
2. **Restart your dev server** (stop and start `npm run dev`)
3. **Try Google sign-in again**

## Important Notes

- Firebase's OAuth client is **different** from your Gmail OAuth client
- You need to configure **both** separately:
  - Firebase OAuth client: For Google sign-in (`/__/auth/handler`)
  - Gmail OAuth client: For Gmail integration (`/api/gmail/callback`)
- The redirect URI format is: `http://localhost:3001/__/auth/handler` (Firebase's format)
- Wait 2-3 minutes after saving changes for them to take effect

## Still Not Working?

1. **Check the error URL** - Look at the browser address bar, it will show the exact redirect URI that's failing
2. **Copy that exact URI** and add it to Google Cloud Console
3. **Make sure** you're editing the **Firebase OAuth client**, not your Gmail one
4. **Check** that Google sign-in is enabled in Firebase Console > Authentication

