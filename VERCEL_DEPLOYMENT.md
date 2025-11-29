# Vercel Deployment Guide

## 🚀 Quick Deploy

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Select your GitHub repository: `b14ckPanther/nmPLOS`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables**
   Click "Environment Variables" and add:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   **Important**: 
   - Add these for **Production**, **Preview**, and **Development** environments
   - Use the same values from your `.env.local` file

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at `https://nmplos.vercel.app` (or custom domain)

### Option 2: Deploy via Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## 🔧 Environment Variables Setup

### Required Variables

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API key | All |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project-id.firebaseapp.com` | All |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project-id` | All |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project-id.appspot.com` | All |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID | All |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your app ID | All |
| `GEMINI_API_KEY` | Your Gemini API key | All (optional) |

### Optional Variables (Server-side)

If you need server-side Firestore access:

| Variable | Value | Environment |
|----------|-------|-------------|
| `FIREBASE_PROJECT_ID` | `nmplos` | Production |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Production |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Production |

## 🌐 Custom Domain (Optional)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## 🔄 Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

## 📝 Post-Deployment Checklist

- [ ] Environment variables added
- [ ] Firebase authorized domains updated (add your Vercel domain)
- [ ] Test authentication (login/register)
- [ ] Test creating tasks
- [ ] Verify Firestore rules are working
- [ ] Check console for errors

## 🔐 Firebase Authorized Domains

After deployment, add your Vercel domain to Firebase:

1. Go to Firebase Console → Authentication → Settings
2. Add to "Authorized domains":
   - `your-app.vercel.app`
   - `your-custom-domain.com` (if using custom domain)

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure `package.json` has correct scripts

### Authentication Not Working
- Verify Firebase authorized domains include Vercel domain
- Check environment variables are correct
- Ensure Firebase project is active

### Firestore Permission Errors
- Verify Firestore rules are deployed
- Check that user is authenticated
- Review Firestore rules in Firebase Console

## 📊 Monitoring

- **Analytics**: Vercel Analytics (optional add-on)
- **Logs**: Vercel Dashboard → Project → Logs
- **Performance**: Vercel Dashboard → Project → Analytics

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Firebase Console**: https://console.firebase.google.com/project/nmplos
- **GitHub Repo**: https://github.com/b14ckPanther/nmPLOS

## 🎉 Success!

Once deployed, your app will be live and accessible worldwide!

