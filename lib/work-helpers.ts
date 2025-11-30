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
  Timestamp,
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Job, Shift, WorkRecord, FreelanceIncome } from "@/firebase/types";

// Helper to ensure db is available
const ensureDb = () => {
  if (!db) {
    throw new Error("Firestore database is not initialized. Please check your Firebase configuration.");
  }
  return db;
};

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to convert Date to Firestore Timestamp
const toTimestamp = (date: Date): Timestamp => {
  if (date instanceof Timestamp) return date;
  return Timestamp.fromDate(date instanceof Date ? date : new Date(date));
};

// Job helpers
export const getJobs = async (uid: string): Promise<Job[]> => {
  const firestore = ensureDb();
  const jobsRef = collection(firestore, `users/${uid}/jobs`);
  const q = query(jobsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt) || new Date(),
    updatedAt: toDate(doc.data().updatedAt) || new Date(),
  })) as Job[];
};

export const createJob = async (uid: string, job: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  const firestore = ensureDb();
  const jobsRef = collection(firestore, `users/${uid}/jobs`);
  const docRef = doc(jobsRef);
  await setDoc(docRef, {
    ...job,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateJob = async (uid: string, jobId: string, updates: Partial<Job>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/jobs`, jobId);
  const updateData: any = { ...updates };
  updateData.updatedAt = Timestamp.now();
  await updateDoc(docRef, updateData);
};

export const deleteJob = async (uid: string, jobId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/jobs`, jobId);
  await deleteDoc(docRef);
};

// Shift helpers
export const getShifts = async (uid: string, jobId?: string): Promise<Shift[]> => {
  const firestore = ensureDb();
  const shiftsRef = collection(firestore, `users/${uid}/shifts`);
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  if (jobId) {
    constraints.unshift(where("jobId", "==", jobId));
  }
  const q = query(shiftsRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: toDate(doc.data().date) || new Date(),
    createdAt: toDate(doc.data().createdAt) || new Date(),
    updatedAt: toDate(doc.data().updatedAt) || new Date(),
  })) as Shift[];
};

export const createShift = async (uid: string, shift: Omit<Shift, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  const firestore = ensureDb();
  const shiftsRef = collection(firestore, `users/${uid}/shifts`);
  const docRef = doc(shiftsRef);
  await setDoc(docRef, {
    ...shift,
    date: toTimestamp(shift.date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateShift = async (uid: string, shiftId: string, updates: Partial<Shift>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/shifts`, shiftId);
  const updateData: any = { ...updates };
  if (updates.date) {
    updateData.date = toTimestamp(updates.date);
  }
  updateData.updatedAt = Timestamp.now();
  await updateDoc(docRef, updateData);
};

export const deleteShift = async (uid: string, shiftId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/shifts`, shiftId);
  await deleteDoc(docRef);
};

// WorkRecord helpers
export const getWorkRecords = async (uid: string, jobId?: string, year?: number, month?: number): Promise<WorkRecord[]> => {
  const firestore = ensureDb();
  const recordsRef = collection(firestore, `users/${uid}/workRecords`);
  const constraints: QueryConstraint[] = [];
  
  // Add where clauses first
  if (jobId) {
    constraints.push(where("jobId", "==", jobId));
  }
  if (year !== undefined) {
    constraints.push(where("year", "==", year));
  }
  if (month !== undefined) {
    constraints.push(where("month", "==", month));
  }
  
  // Add orderBy - if year is filtered, order by year ascending (matching the filter), then month descending
  // Otherwise, order by year descending, then month descending
  if (year !== undefined) {
    constraints.push(orderBy("year", "asc"));
    constraints.push(orderBy("month", "desc"));
  } else {
    constraints.push(orderBy("year", "desc"));
    constraints.push(orderBy("month", "desc"));
  }
  
  const q = query(recordsRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt) || new Date(),
    updatedAt: toDate(doc.data().updatedAt) || new Date(),
  })) as WorkRecord[];
};

export const createWorkRecord = async (uid: string, record: Omit<WorkRecord, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  const firestore = ensureDb();
  const recordsRef = collection(firestore, `users/${uid}/workRecords`);
  const docRef = doc(recordsRef);
  await setDoc(docRef, {
    ...record,
    shifts: record.shifts || [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateWorkRecord = async (uid: string, recordId: string, updates: Partial<WorkRecord>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/workRecords`, recordId);
  const updateData: any = { ...updates };
  updateData.updatedAt = Timestamp.now();
  await updateDoc(docRef, updateData);
};

export const deleteWorkRecord = async (uid: string, recordId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/workRecords`, recordId);
  await deleteDoc(docRef);
};

// Freelance Income helpers
export const getFreelanceIncomes = async (uid: string): Promise<FreelanceIncome[]> => {
  const firestore = ensureDb();
  const incomesRef = collection(firestore, `users/${uid}/freelanceIncomes`);
  const q = query(incomesRef, orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: toDate(doc.data().date) || new Date(),
    dueDate: doc.data().dueDate ? toDate(doc.data().dueDate) : undefined,
    paidDate: doc.data().paidDate ? toDate(doc.data().paidDate) : undefined,
    createdAt: toDate(doc.data().createdAt) || new Date(),
    updatedAt: toDate(doc.data().updatedAt) || new Date(),
  })) as FreelanceIncome[];
};

export const createFreelanceIncome = async (uid: string, income: Omit<FreelanceIncome, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  const firestore = ensureDb();
  const incomesRef = collection(firestore, `users/${uid}/freelanceIncomes`);
  const docRef = doc(incomesRef);
  await setDoc(docRef, {
    ...income,
    date: toTimestamp(income.date),
    dueDate: income.dueDate ? toTimestamp(income.dueDate) : null,
    paidDate: income.paidDate ? toTimestamp(income.paidDate) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateFreelanceIncome = async (uid: string, incomeId: string, updates: Partial<FreelanceIncome>): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/freelanceIncomes`, incomeId);
  const updateData: any = { ...updates };
  if (updates.date) {
    updateData.date = toTimestamp(updates.date);
  }
  if (updates.dueDate !== undefined) {
    updateData.dueDate = updates.dueDate ? toTimestamp(updates.dueDate) : null;
  }
  if (updates.paidDate !== undefined) {
    updateData.paidDate = updates.paidDate ? toTimestamp(updates.paidDate) : null;
  }
  updateData.updatedAt = Timestamp.now();
  await updateDoc(docRef, updateData);
};

export const deleteFreelanceIncome = async (uid: string, incomeId: string): Promise<void> => {
  const firestore = ensureDb();
  const docRef = doc(firestore, `users/${uid}/freelanceIncomes`, incomeId);
  await deleteDoc(docRef);
};

