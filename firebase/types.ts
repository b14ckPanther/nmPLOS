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
  grade?: number | null; // Grade received (0-100 or letter grade converted to number)
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

export interface Subscription {
  id: string;
  name: string;
  amount: number; // Monthly amount in NIS
  billingDate: number; // Day of month (1-31)
  category?: string;
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export interface Job {
  id: string;
  title: string;
  company: string;
  hourlyRate: number; // Hourly payment in NIS
  overtimeRate: number; // Multiplier for overtime (e.g., 1.25 for 125%)
  overtimeThreshold: number; // Hours after which overtime applies
  transportPayment: number; // Monthly transport payment in NIS
  transportPaymentDate: number; // Day of month when transport is paid (e.g., 1-31)
  paidVacationDays: number; // Total paid vacation days per year
  usedVacationDays: number; // Used vacation days
  illnessDays: number; // Total illness/sick days per year
  usedIllnessDays: number; // Used illness days
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  jobId: string;
  date: Date;
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  hours: number; // Calculated hours worked
  shiftType: "morning" | "afternoon" | "night"; // Type of shift
  isOvertime: boolean; // Whether this shift includes overtime hours
  regularHours: number; // Regular hours at 100%
  overtime125Hours: number; // Overtime hours at 125%
  overtime150Hours: number; // Overtime hours at 150%
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkRecord {
  id: string;
  jobId: string;
  month: number; // 1-12
  year: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  overtime125Hours: number;
  overtime150Hours: number;
  regularPay: number;
  overtimePay: number;
  overtime125Pay: number;
  overtime150Pay: number;
  transportPayment: number;
  vacationDaysUsed: number;
  illnessDaysUsed: number;
  totalPay: number;
  shifts: string[]; // Shift IDs for this month
  createdAt: Date;
  updatedAt: Date;
}

export interface FreelanceIncome {
  id: string;
  title: string;
  description?: string;
  amount: number; // Amount in NIS
  date: Date;
  client?: string;
  category?: string; // e.g., "design", "development", "consulting", etc.
  status: "pending" | "paid" | "overdue";
  dueDate?: Date;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Sidebar Navigation Types
export interface NavItem {
  href: string;
  label: string;
  iconName: string; // Icon name from lucide-react
}

export interface SidebarCategory {
  id: string;
  name: string;
  icon?: string;
  items: NavItem[];
  order: number;
  collapsed?: boolean;
}

export interface SidebarPreferences {
  categories: SidebarCategory[];
  updatedAt: Date;
}

// Prayer Types
export interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
}

export interface PrayerRecord {
  id: string;
  prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  date: Date;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

export interface Dua {
  id: string;
  title: string;
  text: string;
  translation?: string;
  category?: string;
  date: Date;
  createdAt: Date;
}

// Gym Types
export interface GymWorkout {
  id: string;
  date: Date;
  workoutType: string;
  exercises: GymExercise[];
  duration: number; // minutes
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GymExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number; // kg
  duration?: number; // seconds for time-based exercises
  notes?: string;
}

export interface GymLesson {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  instructor?: string;
  type: "cardio" | "strength" | "yoga" | "pilates" | "boxing" | "other";
  attended: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GymAttendance {
  id: string;
  date: Date;
  workoutId?: string;
  lessonId?: string;
  duration: number; // minutes
  createdAt: Date;
}

export interface GymProgress {
  id: string;
  metric: "weight" | "muscle_mass" | "body_fat" | "strength" | "endurance";
  value: number;
  unit: string;
  date: Date;
  notes?: string;
  createdAt: Date;
}

export interface GymAlert {
  id: string;
  type: "missed_session" | "low_attendance" | "health_reminder";
  message: string;
  date: Date;
  resolved: boolean;
  createdAt: Date;
}

