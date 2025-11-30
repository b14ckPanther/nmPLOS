# Gmail Integration Setup Guide

## Step 1: Set Up Google OAuth 2.0 Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create a new one)

2. **Enable Gmail API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

3. **Create/Edit OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID" (or edit existing one)
   - If prompted, configure OAuth consent screen first:
     - User Type: External (or Internal if using Google Workspace)
     - App name: nmPLOS
     - User support email: your email
     - Developer contact: your email
     - Scopes: Add `https://www.googleapis.com/auth/gmail.readonly`
     - Save and continue
   - Application type: **Web application**
   - Name: nmPLOS Gmail Integration
   - **IMPORTANT: Add Authorized JavaScript origins** (click "+ Add URI" for each):
     - `http://localhost:3001` (for development)
     - `http://localhost:3000` (if using dev:3000)
     - Your production URL (e.g., `https://your-domain.vercel.app`)
   - **IMPORTANT: Add Authorized redirect URIs** (click "+ Add URI" for each):
     - `http://localhost:3001/api/gmail/callback` (for development)
     - `http://localhost:3000/api/gmail/callback` (if using dev:3000)
     - `https://your-domain.vercel.app/api/gmail/callback` (for production)
   - Click "Create" or "Save"
   - **After creating/editing, copy the Client ID and Client Secret:**
     - Click the edit (pencil) icon on your OAuth client
     - Copy the Client ID (shown as "297028033658-xxxxx..." or similar)
     - Click "Show" next to Client Secret to reveal and copy it (only shown once!)

4. **Add to Environment Variables**
   Add these to your `.env.local` file:
   ```
   GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
   NEXT_PUBLIC_APP_URL=http://localhost:3001
   ```

## Step 2: Install Required Packages

```bash
npm install googleapis
```

## Step 3: How It Works

1. User clicks "Connect Gmail"
2. Redirects to Google OAuth consent screen
3. User authorizes access
4. Google redirects back to `/api/gmail/callback`
5. Exchange authorization code for access/refresh tokens
6. Store tokens securely in Firestore
7. Use tokens to fetch emails via Gmail API

## Security Notes

- Refresh tokens are stored encrypted in Firestore
- Access tokens are short-lived and refreshed automatically
- All API routes verify Firebase auth before processing
- Tokens are user-specific and isolated

