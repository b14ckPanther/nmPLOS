# Recover Firebase OAuth Client

## What Happened
You edited the "Web client (auto created by Google Service)" OAuth client, and now it might be missing or incorrectly configured.

## Solution Options

### Option 1: Let Firebase Recreate It (Easiest)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project

2. **Go to Authentication > Sign-in method**
   - Click on "Google" provider
   - **Disable** it temporarily
   - Click "Save"
   - **Wait 30 seconds**
   - **Enable** it again
   - Click "Save"

3. **Firebase will automatically create a new OAuth client**
   - Wait 1-2 minutes
   - Then follow the fix steps below

### Option 2: Check for Existing Firebase OAuth Client

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Make sure you're in the **same project** as Firebase

2. **Look for OAuth 2.0 Client IDs:**
   - Look for one that has your Firebase project ID in the name
   - Or one that shows "Web client" or similar
   - Check if any existing one has redirect URIs like `/__/auth/handler`

3. **If you find one, use it** - just add the redirect URIs from Step 3 below

### Option 3: Create a New OAuth Client for Firebase (Manual)

If Firebase doesn't recreate it, create one manually:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Make sure you're in the **same project** as Firebase

2. **Click "Create Credentials" > "OAuth client ID"**
   - If prompted, configure OAuth consent screen first
   - Application type: **Web application**
   - Name: `Firebase Auth Web Client` (or any name)

3. **Add Authorized JavaScript origins:**
   ```
   http://localhost:3001
   http://127.0.0.1:3001
   https://nmplos.vercel.app
   ```

4. **Add Authorized redirect URIs:**
   ```
   http://localhost:3001/__/auth/handler
   http://127.0.0.1:3001/__/auth/handler
   https://nmplos.vercel.app/__/auth/handler
   ```

5. **Click "Create"**
   - Copy the **Client ID** (you'll need it)

6. **Configure Firebase to use this Client ID:**
   - Go to Firebase Console > Authentication > Sign-in method
   - Click on "Google"
   - Under "Web SDK configuration", paste the Client ID you just copied
   - Click "Save"

## Add Redirect URIs (Critical Step)

No matter which option you choose, you MUST add these redirect URIs:

1. **Go to Google Cloud Console > APIs & Services > Credentials**
2. **Find your Firebase OAuth client** (the one Firebase uses)
3. **Click edit (pencil icon)**
4. **Add these EXACT redirect URIs:**
   ```
   http://localhost:3001/__/auth/handler
   http://127.0.0.1:3001/__/auth/handler
   https://nmplos.vercel.app/__/auth/handler
   ```

5. **Add these JavaScript origins:**
   ```
   http://localhost:3001
   http://127.0.0.1:3001
   https://nmplos.vercel.app
   ```

6. **Click "Save"**
7. **Wait 2-3 minutes** for changes to propagate

## Verify It's Working

1. **Clear browser cache** or use **incognito window**
2. **Restart dev server** (stop and start `npm run dev`)
3. **Try Google sign-in again**

## How to Find Firebase's OAuth Client ID

If you're not sure which OAuth client Firebase is using:

1. **Go to Firebase Console**
   - Authentication > Sign-in method > Google
   - Look for "Web SDK configuration" section
   - You'll see the Client ID there
   - Copy that Client ID

2. **Go to Google Cloud Console**
   - APIs & Services > Credentials
   - Find the OAuth client with that exact Client ID
   - That's the one you need to edit!

## Important Notes

- Firebase's OAuth client is **separate** from your Gmail OAuth client
- The redirect URI format for Firebase is: `/__/auth/handler` (not `/api/gmail/callback`)
- You need **both** OAuth clients:
  - Firebase OAuth client: For Google sign-in (`/__/auth/handler`)
  - Gmail OAuth client: For Gmail integration (`/api/gmail/callback`)

1