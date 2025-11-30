# OAuth App: Production vs Testing Mode

## Current Status: Your app is "In production"

You have two options:

## Option 1: Switch to Testing Mode (Recommended for Development)

### Benefits:
- ✅ Unlimited test users (no 100 user cap)
- ✅ No app verification required
- ✅ Perfect for development and testing
- ✅ Can easily switch back to production later

### How to Switch:
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Find "Publishing status" section
3. Click the blue "Back to testing" button
4. Confirm the change
5. Add test users in the "Test users" section

### Then Add Test Users:
- Scroll to "Test users" section
- Click "+ ADD USERS"
- Add your Gmail email addresses
- Save

## Option 2: Keep in Production Mode

### Benefits:
- ✅ Already set up for production
- ✅ Can be used by up to 100 users without verification

### Limitations:
- ⚠️ Limited to 100 users total (you're at 1/100 now)
- ⚠️ Users will see "unverified app" warning
- ⚠️ Requires full verification for more than 100 users

### If Keeping Production:
- No need to add test users (they're not used in production mode)
- Users can click "Advanced" → "Go to [app] (unsafe)" to proceed
- You'll hit the 100 user cap eventually

## Recommendation for Your Project

**Since this is an educational/personal project:**
- Switch to **Testing Mode** for now
- Add yourself (and any test accounts) as test users
- Switch back to Production only when you're ready for real users

## Switching Back to Production Later

When ready:
1. Complete app verification (provide privacy policy, etc.)
2. Click "PUBLISH APP" button
3. App will be in production mode

