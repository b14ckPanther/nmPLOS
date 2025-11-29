import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/firebase/client";
import type { 
  Task, 
  Course, 
  Transaction, 
  Bill, 
  Project, 
  Exam,
  UserProfile,
  UserSettings,
  FinancialPreferences
} from "@/firebase/types";

// Helper to ensure db is available
const ensureDb = () => {
  if (!db) {
    throw new Error("Firestore database is not initialized. Please check your Firebase configuration.");
  }
  return db;
};

// Helper to convert Firestore Timestamp to Date
export const toDate = (timestamp: Timestamp | Date | null | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return undefined;
};

// Helper to convert Date to Firestore Timestamp
export const toTimestamp = (date: Date | undefined): Timestamp | undefined => {
  if (!date) return undefined;
  return Timestamp.fromDate(date);
};

// User Profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/profile`, "data");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
    } as UserProfile;
  }
  return null;
};

export const setUserProfile = async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/profile`, "data");
  await setDoc(docRef, {
    ...profile,
    updatedAt: Timestamp.now(),
  }, { merge: true });
};

// Tasks
export const getTasks = async (uid: string, filters?: { completed?: boolean }): Promise<Task[]> => {
  const firestore = ensureDb();
  const tasksRef = collection(firestore, `users/${uid}/tasks`);
  const constraints: QueryConstraint[] = [];
  
  if (filters?.completed !== undefined) {
    constraints.push(where("completed", "==", filters.completed));
  }
  
  constraints.push(orderBy("createdAt", "desc"));
  
  const q = query(tasksRef, ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dueDate: toDate(doc.data().dueDate),
    createdAt: toDate(doc.data().createdAt) || new Date(),
    updatedAt: toDate(doc.data().updatedAt) || new Date(),
  })) as Task[];
};

export const createTask = async (uid: string, task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  const firestore = ensureDb();
  const tasksRef = collection(firestore, `users/${uid}/tasks`);
  const docRef = doc(tasksRef);
  await setDoc(docRef, {
    ...task,
    dueDate: task.dueDate ? toTimestamp(task.dueDate) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateTask = async (uid: string, taskId: string, updates: Partial<Task>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/tasks`, taskId);
  const updateData: any = { ...updates };
  if (updates.dueDate !== undefined) {
    updateData.dueDate = updates.dueDate ? toTimestamp(updates.dueDate) : null;
  }
  updateData.updatedAt = Timestamp.now();
  await updateDoc(docRef, updateData);
};

export const deleteTask = async (uid: string, taskId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/tasks`, taskId);
  await deleteDoc(docRef);
};

// Transactions
export const getTransactions = async (uid: string, limitCount?: number): Promise<Transaction[]> => {
  const firestore = ensureDb();
  const transactionsRef = collection(firestore, `users/${uid}/transactions`);
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  
  if (limitCount) {
    constraints.push(limit(limitCount));
  }
  
  const q = query(transactionsRef, ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: toDate(doc.data().date) || new Date(),
    createdAt: toDate(doc.data().createdAt) || new Date(),
  })) as Transaction[];
};

export const createTransaction = async (
  uid: string,
  transaction: Omit<Transaction, "id" | "createdAt">
): Promise<string> => {
  const firestore = ensureDb();
  const transactionsRef = collection(firestore, `users/${uid}/transactions`);
  const docRef = doc(transactionsRef);
  await setDoc(docRef, {
    ...transaction,
    date: toTimestamp(transaction.date),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

// Update and Delete Transactions
export const updateTransaction = async (uid: string, transactionId: string, updates: Partial<Transaction>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/transactions`, transactionId);
  const updateData: any = { ...updates };
  if (updates.date !== undefined) {
    updateData.date = updates.date ? toTimestamp(updates.date) : null;
  }
  await updateDoc(docRef, updateData);
};

export const deleteTransaction = async (uid: string, transactionId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/transactions`, transactionId);
  await deleteDoc(docRef);
};

// Bills
export const getBills = async (uid: string, filters?: { paid?: boolean }): Promise<Bill[]> => {
  const firestore = ensureDb();
  const billsRef = collection(firestore, `users/${uid}/bills`);
  const constraints: QueryConstraint[] = [orderBy("dueDate", "asc")];
  
  if (filters?.paid !== undefined) {
    constraints.push(where("paid", "==", filters.paid));
  }
  
  const q = query(billsRef, ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dueDate: toDate(doc.data().dueDate) || new Date(),
    createdAt: toDate(doc.data().createdAt) || new Date(),
  })) as Bill[];
};

export const createBill = async (uid: string, bill: Omit<Bill, "id" | "createdAt">): Promise<string> => {
  const firestore = ensureDb();
  const billsRef = collection(firestore, `users/${uid}/bills`);
  const docRef = doc(billsRef);
  await setDoc(docRef, {
    ...bill,
    dueDate: toTimestamp(bill.dueDate),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateBill = async (uid: string, billId: string, updates: Partial<Bill>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/bills`, billId);
  const updateData: any = { ...updates };
  if (updates.dueDate !== undefined) {
    updateData.dueDate = updates.dueDate ? toTimestamp(updates.dueDate) : null;
  }
  await updateDoc(docRef, updateData);
};

export const deleteBill = async (uid: string, billId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/bills`, billId);
  await deleteDoc(docRef);
};

// Courses
export const getCourses = async (uid: string): Promise<Course[]> => {
  const firestore = ensureDb();
  const coursesRef = collection(firestore, `users/${uid}/courses`);
  const q = query(coursesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt) || new Date(),
    updatedAt: toDate(doc.data().updatedAt) || new Date(),
  })) as Course[];
};

export const createCourse = async (uid: string, course: Omit<Course, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  const firestore = ensureDb();
  const coursesRef = collection(firestore, `users/${uid}/courses`);
  const docRef = doc(coursesRef);
  await setDoc(docRef, {
    ...course,
    assignments: course.assignments || [],
    exams: course.exams || [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateCourse = async (uid: string, courseId: string, updates: Partial<Course>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/courses`, courseId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

export const deleteCourse = async (uid: string, courseId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/courses`, courseId);
  await deleteDoc(docRef);
};

// Exams
export const getExams = async (uid: string, filters?: { courseId?: string }): Promise<Exam[]> => {
  const firestore = ensureDb();
  const examsRef = collection(firestore, `users/${uid}/exams`);
  const constraints: QueryConstraint[] = [orderBy("date", "asc")];
  
  if (filters?.courseId) {
    constraints.push(where("courseId", "==", filters.courseId));
  }
  
  const q = query(examsRef, ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: toDate(doc.data().date) || new Date(),
    createdAt: toDate(doc.data().createdAt) || new Date(),
  })) as Exam[];
};

export const createExam = async (uid: string, exam: Omit<Exam, "id" | "createdAt">): Promise<string> => {
  const firestore = ensureDb();
  const examsRef = collection(firestore, `users/${uid}/exams`);
  const docRef = doc(examsRef);
  await setDoc(docRef, {
    ...exam,
    date: toTimestamp(exam.date),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateExam = async (uid: string, examId: string, updates: Partial<Exam>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/exams`, examId);
  const updateData: any = { ...updates };
  if (updates.date !== undefined) {
    updateData.date = updates.date ? toTimestamp(updates.date) : null;
  }
  await updateDoc(docRef, updateData);
};

export const deleteExam = async (uid: string, examId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/exams`, examId);
  await deleteDoc(docRef);
};

// Projects
export const getProjects = async (uid: string, filters?: { status?: string }): Promise<Project[]> => {
  const firestore = ensureDb();
  const projectsRef = collection(firestore, `users/${uid}/projects`);
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  
  if (filters?.status) {
    constraints.push(where("status", "==", filters.status));
  }
  
  const q = query(projectsRef, ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startDate: toDate(doc.data().startDate) || new Date(),
    dueDate: toDate(doc.data().dueDate),
    createdAt: toDate(doc.data().createdAt) || new Date(),
    updatedAt: toDate(doc.data().updatedAt) || new Date(),
  })) as Project[];
};

export const createProject = async (uid: string, project: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  const firestore = ensureDb();
  const projectsRef = collection(firestore, `users/${uid}/projects`);
  const docRef = doc(projectsRef);
  await setDoc(docRef, {
    ...project,
    tasks: project.tasks || [],
    startDate: toTimestamp(project.startDate),
    dueDate: project.dueDate ? toTimestamp(project.dueDate) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateProject = async (uid: string, projectId: string, updates: Partial<Project>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/projects`, projectId);
  const updateData: any = { ...updates };
  if (updates.startDate !== undefined) {
    updateData.startDate = updates.startDate ? toTimestamp(updates.startDate) : null;
  }
  if (updates.dueDate !== undefined) {
    updateData.dueDate = updates.dueDate ? toTimestamp(updates.dueDate) : null;
  }
  updateData.updatedAt = Timestamp.now();
  await updateDoc(docRef, updateData);
};

export const deleteProject = async (uid: string, projectId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/projects`, projectId);
  await deleteDoc(docRef);
};

