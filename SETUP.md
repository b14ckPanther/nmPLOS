# Setup Instructions

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side) - Optional for now
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password"
   - Enable "Google" provider
4. Create a Firestore database:
   - Go to Firestore Database
   - Create database in production mode (or test mode for development)
   - Choose a location
5. Get your config:
   - Go to Project Settings > General
   - Scroll to "Your apps" and add a web app if you haven't
   - Copy the Firebase configuration object values
6. Deploy Firestore Rules and Indexes:
   ```bash
   # Install Firebase CLI (if not already installed)
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Set your project
   firebase use your-project-id
   
   # Deploy rules and indexes
   firebase deploy --only firestore
   ```
7. Add Authorized Domains (for Google Sign-In):
   - Go to Authentication > Settings
   - Add `127.0.0.1` and your production domain to "Authorized domains"

## Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env.local` file

## PWA Icons

Create the following icon files in the `public` directory:

- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)
- `favicon.ico` (standard favicon)

You can use any image editor or online tool to create these icons. The app logo should be "nmPLOS" or your preferred design.

## Running the App

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Building for Production

```bash
npm run build
npm start
```

## Deployment

The app is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

For Firebase Hosting:
```bash
npm run build
firebase deploy
```

