import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { storeGmailTokensServer } from "@/lib/gmail-helpers-server";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/gmail?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/gmail?error=missing_parameters`
      );
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/gmail/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/gmail?error=config_error`
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/gmail?error=token_error`
      );
    }

    // Store tokens in Firestore
    await storeGmailTokensServer(state, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || Date.now() + 3600000, // Default 1 hour
      scope: tokens.scope || "",
    });

    // Redirect back to Gmail page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/gmail?connected=true`
    );
  } catch (error: any) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/gmail?error=${encodeURIComponent(error.message || "callback_error")}`
    );
  }
}

