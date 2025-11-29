// Firestore Collection Types

export interface UserProfile {
  displayName?: string;
  email: string;
  photoURL?: string;
  degreeTotalPoints?: number; // Total points required for degree (e.g., 120 for BSc)
  manualEarnedPoints?: number; // Manually set points for previously completed courses not in system
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  currency: "ILS";
  language: "en" | "he" | "ar";
  notifications: {
    email: boolean;
    push: boolean;
    reminders: boolean;
  };
}

export interface FinancialPreferences {
  monthlySalary: number;
  salaryDate: number; // Day of month (e.g., 10)
  autoResetBudget: boolean;
  budgetCategories: {
    [category: string]: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  name: string;
  semester: "A" | "B";
  year: number;
  progress: number; // 0-100
  points: number; // Credit points for this course
  grade?: number; // Grade received (0-100 or letter grade converted to number)
  completed: boolean; // Whether the course is completed
  assignments: string[]; // Task IDs
  exams: string[]; // Exam IDs
  studyPlan?: {
    [date: string]: string[]; // Date -> task descriptions
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Exam {
  id: string;
  courseId?: string;
  name: string;
  date: Date;
  location?: string;
  notes?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  amount: number; // NIS
  category: string;
  date: Date;
  type: "income" | "expense";
  recurring?: boolean;
  recurringPattern?: "monthly" | "weekly" | "yearly";
  notes?: string;
  createdAt: Date;
}

export interface Bill {
  id: string;
  name: string;
  amount: number; // NIS
  dueDate: Date;
  paid: boolean;
  recurring: boolean;
  category?: string;
  notes?: string;
  createdAt: Date;
}

export interface GmailMessage {
  id: string;
  gmailId: string; // Gmail message ID
  subject: string;
  from: string;
  date: Date;
  label?: string;
  category?: "bills" | "assignments" | "projects" | "receipts" | "banking" | "university" | "other";
  body: string;
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }[];
  syncedAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  startDate: Date;
  dueDate?: Date;
  progress: number; // 0-100
  status: "not-started" | "in-progress" | "completed" | "on-hold";
  tasks: string[]; // Task IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "custom";
  streak: number;
  lastCompleted?: Date;
  createdAt: Date;
}

