import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Please set it in your environment variables." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get user context from request body
    // Note: In production, verify the auth token server-side using Firebase Admin
    // and fetch context from Firestore server-side
    let userContext = "";
    
    if (context) {
      userContext = `
User's current tasks: ${JSON.stringify(context.tasks || [])}
Recent transactions: ${JSON.stringify(context.transactions || [])}
`;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `You are a helpful AI assistant for a Personal Life OS application. The user can ask you about their tasks, finances, schedule, courses, and more.

${userContext ? `User Context:\n${userContext}\n` : ""}

When the user asks to navigate somewhere, respond with a JSON object like:
{
  "text": "Your response text",
  "action": {
    "type": "navigate",
    "to": "/finance/overview"
  }
}

Otherwise, just respond naturally. Be concise and helpful.

User message: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON action if present
    let action = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*"action"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        action = parsed.action;
      }
    } catch (e) {
      // Not JSON, that's fine
    }

    return NextResponse.json({
      text: text.replace(/\{[\s\S]*"action"[\s\S]*\}/, "").trim() || text,
      action,
    });
  } catch (error: any) {
    console.error("Assistant error:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to process request";
    if (error instanceof Error) {
      if (error.message.includes("API_KEY")) {
        errorMessage = "API key is invalid or missing. Please check your GEMINI_API_KEY environment variable.";
      } else if (error.message.includes("quota") || error.message.includes("limit")) {
        errorMessage = "API quota exceeded. Please check your Gemini API usage limits.";
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else {
        errorMessage = error.message || "Failed to process request";
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 }
    );
  }
}

