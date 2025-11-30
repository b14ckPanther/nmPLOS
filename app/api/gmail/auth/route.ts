import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Detect the app URL from the request
    const origin = request.nextUrl.origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = `${appUrl}/api/gmail/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth credentials not configured" },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Scopes for Gmail read-only access
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
    ];

    // Generate the OAuth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Required to get refresh token
      scope: scopes,
      prompt: "select_account consent", // Force account selection and consent screen every time
      state: userId, // Pass userId through state parameter for security
    });

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error("Gmail auth error:", error);
    return NextResponse.json(
      { error: "Failed to initialize Gmail authentication" },
      { status: 500 }
    );
  }
}

