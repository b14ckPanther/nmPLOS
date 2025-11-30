import { GoogleGenerativeAI } from "@google/generative-ai";

export type EmailCategory = "bills" | "assignments" | "projects" | "receipts" | "banking" | "university" | "other";

interface CategorizeEmailInput {
  subject: string;
  from: string;
  body: string;
}

export async function categorizeEmail(
  email: CategorizeEmailInput
): Promise<EmailCategory> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found, using default category 'other'");
    return "other";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Categorize this email into one of these categories: bills, assignments, projects, receipts, banking, university, or other.

Email Subject: ${email.subject}
From: ${email.from}
Body Preview: ${email.body.substring(0, 500)}

Respond with ONLY one word from the category list. Do not include any explanation or additional text.

Categories:
- bills: Utility bills, subscription renewals, payment reminders
- assignments: Homework, coursework, assignment submissions
- projects: Project updates, work-related project emails
- receipts: Purchase confirmations, transaction receipts, order confirmations
- banking: Bank statements, account updates, financial notifications
- university: University announcements, academic emails, course information
- other: Everything else that doesn't fit the above categories

Your response (one word only):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim().toLowerCase();

    // Validate category
    const validCategories: EmailCategory[] = [
      "bills",
      "assignments",
      "projects",
      "receipts",
      "banking",
      "university",
      "other",
    ];

    if (validCategories.includes(category as EmailCategory)) {
      return category as EmailCategory;
    }

    return "other";
  } catch (error) {
    console.error("Error categorizing email:", error);
    return "other";
  }
}

