# Firebase Setup Guide

## Quick Setup

The app is showing a Firebase error because the environment variables are not configured. Follow these steps:

### 1. Create `.env.local` file

Create a file named `.env.local` in the root directory (`c:\Users\ShamsGaming\Desktop\nmPLOS\.env.local`)

### 2. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Once your project is created, click the gear icon ⚙️ next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. Click the web icon `</>` to add a web app
7. Register your app (you can name it "nmPLOS")
8. Copy the `firebaseConfig` object values

### 3. Add to `.env.local`

Copy this template and fill in your values from Firebase Console:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Enable Authentication

1. In Firebase Console, go to "Authentication" in the left menu
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password"
5. Enable "Google" (optional but recommended)

### 4.5. Add Authorized Domains (IMPORTANT for Google Sign-In)

1. In Firebase Console, go to "Authentication"
2. Click on the "Settings" tab (gear icon)
3. Scroll down to "Authorized domains"
4. Click "Add domain" and add:
   - `127.0.0.1` (for development)
   - `localhost` (optional, if you fix your hosts file)
5. Click "Add" for each domain

**Note:** Without adding `127.0.0.1` to authorized domains, Google sign-in will show "The requested action is invalid" error.

### 5. Create Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" (or test mode for development)
4. Select a location (choose closest to you)
5. Click "Enable"

### 6. Restart Development Server

After creating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Example `.env.local` File

**⚠️ IMPORTANT: Never commit this file! All keys must be kept in `.env.local` only.**

Create `.env.local` in the root directory with your actual credentials from Firebase Console. The file should contain:

```env
# Firebase Configuration (get these from Firebase Console > Project Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_from_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini API (Optional - for AI Assistant)
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

## Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"

- Make sure your `.env.local` file exists in the root directory
- Check that all `NEXT_PUBLIC_` variables are set
- Restart the dev server after creating/updating `.env.local`
- Make sure there are no extra spaces or quotes around the values

### Error: "Firebase Auth is not initialized"

- Check the browser console for the exact error message
- Verify all environment variables are correct
- Make sure the file is named exactly `.env.local` (not `.env.local.txt`)

### Error: "The requested action is invalid" (Google Sign-In)

- This means `127.0.0.1` is not in your Firebase authorized domains
- Go to Firebase Console > Authentication > Settings > Authorized domains
- Add `127.0.0.1` to the list
- Wait 2-3 minutes for changes to propagate
- See `FIREBASE_GOOGLE_AUTH_FIX.md` for detailed instructions

### Still having issues?

1. Check that your `.env.local` file is in the root directory (same level as `package.json`)
2. Make sure you're using `NEXT_PUBLIC_` prefix for client-side variables
3. Restart the dev server completely (stop and start again)
4. Clear browser cache and hard refresh (Ctrl+Shift+R)
5. For Google sign-in issues, make sure `127.0.0.1` is in authorized domains

## Security Note

⚠️ **Never commit `.env.local` to git!** It's already in `.gitignore`, but make sure it stays that way. These are your private credentials.

