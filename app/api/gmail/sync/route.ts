import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGmailTokensServer, storeGmailTokensServer, storeGmailMessageServer } from "@/lib/gmail-helpers-server";
import { categorizeEmail } from "@/lib/gmail-ai-categorize";

// Helper to refresh access token if needed
async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = await getGmailTokensServer(userId);
  if (!tokens) return null;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/gmail/callback`;

  if (!clientId || !clientSecret) return null;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  // Check if token is expired or about to expire (within 5 minutes)
  const now = Date.now();
  if (tokens.expiryDate - now < 5 * 60 * 1000) {
    try {
      // Refresh the token
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      await storeGmailTokensServer(userId, {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || tokens.refreshToken,
        expiryDate: credentials.expiry_date || Date.now() + 3600000,
        scope: credentials.scope || tokens.scope,
      });

      return credentials.access_token || null;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return null;
    }
  }

  return tokens.accessToken;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Gmail not connected or token expired" },
        { status: 401 }
      );
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/gmail/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Fetch recent emails (last 50)
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
      q: "is:unread OR in:inbox", // Get unread or inbox emails
    });

    const messages = response.data.messages || [];
    let syncedCount = 0;

    // Process each message
    for (const message of messages.slice(0, 50)) {
      try {
        // Get full message details
        const messageDetail = await gmail.users.messages.get({
          userId: "me",
          id: message.id!,
          format: "full",
        });

        const msg = messageDetail.data;
        const headers = msg.payload?.headers || [];

        const getHeader = (name: string) => {
          return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value || "";
        };

        const subject = getHeader("Subject");
        const from = getHeader("From");
        const dateHeader = getHeader("Date");
        const date = dateHeader ? new Date(dateHeader) : new Date();

        // Extract body text
        let bodyText = "";
        if (msg.payload?.body?.data) {
          bodyText = Buffer.from(msg.payload.body.data, "base64").toString(
            "utf-8"
          );
        } else if (msg.payload?.parts) {
          for (const part of msg.payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              bodyText += Buffer.from(part.body.data, "base64").toString(
                "utf-8"
              );
            }
          }
        }

        // Categorize email using AI
        const category = await categorizeEmail({
          subject,
          from,
          body: bodyText.substring(0, 1000), // Limit for API
        });

        // Store in Firestore
        await storeGmailMessageServer(userId, {
          gmailId: message.id!,
          subject: subject || "(No subject)",
          from: from || "Unknown",
          date,
          category,
          body: bodyText.substring(0, 5000), // Limit body length
          syncedAt: new Date(),
        });

        syncedCount++;
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        // Continue with other messages
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      totalMessages: messages.length,
    });
  } catch (error: any) {
    console.error("Gmail sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync emails",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

