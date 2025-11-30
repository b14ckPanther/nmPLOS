import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGmailTokensServer, storeGmailTokensServer, storeGmailMessageServer } from "@/lib/gmail-helpers-server";
import { categorizeEmail } from "@/lib/gmail-ai-categorize";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper to refresh access token if needed
async function getValidAccessToken(userId: string, requestOrigin?: string): Promise<string | null> {
  const tokens = await getGmailTokensServer(userId);
  if (!tokens) return null;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  // Always prioritize request origin over env var
  const appUrl = requestOrigin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const redirectUri = `${appUrl}/api/gmail/callback`;

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
    // ALWAYS use request origin (works for both localhost and production)
    const origin = request.nextUrl.origin;
    const appUrl = origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(userId, origin);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Gmail not connected or token expired" },
        { status: 401 }
      );
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = `${appUrl}/api/gmail/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Calculate date 30 days ago for filtering
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Gmail search query: emails from last 30 days in inbox
    // Format: after:YYYY/MM/DD (Gmail uses YYYY/MM/DD format)
    const year = thirtyDaysAgo.getFullYear();
    const month = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
    const day = String(thirtyDaysAgo.getDate()).padStart(2, '0');
    const dateQuery = `after:${year}/${month}/${day}`;
    const searchQuery = `in:inbox ${dateQuery}`;

    console.log("Gmail sync query:", searchQuery);

    // Fetch emails from last 30 days (limit to 100 for safety)
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      q: searchQuery,
    });

    const messages = response.data.messages || [];
    console.log(`Found ${messages.length} messages from last 30 days`);
    
    let syncedCount = 0;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Process each message
    for (const message of messages) {
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

        // Double-check: only process emails from last 30 days
        if (date < oneMonthAgo) {
          console.log(`Skipping email older than 30 days: ${subject} (${date.toISOString()})`);
          continue;
        }

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
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });
    
    return NextResponse.json(
      {
        error: "Failed to sync emails",
        details: process.env.NODE_ENV === "development" ? {
          message: error.message,
          code: error.code,
          stack: error.stack,
        } : undefined,
      },
      { status: 500 }
    );
  }
}

