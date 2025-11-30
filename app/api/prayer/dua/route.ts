import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { category, language = "en" } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Generate a brief and concise Islamic Dua (prayer/supplication) ${category ? `about ${category}` : "for today"}. 

Requirements:
- Keep it SHORT and brief (2-3 lines maximum in Arabic)
- Include the Arabic text with proper diacritics (tashkeel)
- Provide a brief English explanation/translation (1-2 sentences)
- Make it authentic and meaningful
- Format as: Arabic text first, then English explanation below

${category ? `Category: ${category}` : "Make it a general daily Dua"}

Format:
Arabic (with diacritics):
[Arabic text here]

English:
[Brief explanation here]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      dua: text,
      category: category || "general",
      language,
      date: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Dua generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate Dua" },
      { status: 500 }
    );
  }
}

