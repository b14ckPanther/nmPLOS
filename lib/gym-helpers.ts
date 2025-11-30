import { db } from "@/firebase/client";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type {
  GymWorkout,
  GymLesson,
  GymAttendance,
  GymProgress,
  GymAlert,
} from "@/firebase/types";

// Workout Helpers
export const createWorkout = async (
  userId: string,
  workout: Omit<GymWorkout, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const workoutsRef = collection(firestore, `users/${userId}/gym/workouts`);
  const docRef = doc(workoutsRef);
  
  await setDoc(docRef, {
    ...workout,
    date: Timestamp.fromDate(workout.date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Create attendance record
  await createAttendance(userId, {
    date: workout.date,
    workoutId: docRef.id,
    duration: workout.duration,
  });

  return docRef.id;
};

export const getWorkouts = async (
  userId: string,
  limit?: number
): Promise<GymWorkout[]> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const workoutsRef = collection(firestore, `users/${userId}/gym/workouts`);
  let q = query(workoutsRef, orderBy("date", "desc"));
  if (limit) {
    // Note: Firestore requires index for limit with orderBy
    // For now, we'll fetch all and limit in memory
  }

  const snapshot = await getDocs(q);
  let workouts = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as GymWorkout;
  });

  if (limit) {
    workouts = workouts.slice(0, limit);
  }

  return workouts;
};

// Lesson Helpers
export const createLesson = async (
  userId: string,
  lesson: Omit<GymLesson, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const lessonsRef = collection(firestore, `users/${userId}/gym/lessons`);
  const docRef = doc(lessonsRef);
  
  await setDoc(docRef, {
    ...lesson,
    date: Timestamp.fromDate(lesson.date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
};

export const getLessons = async (
  userId: string,
  upcomingOnly: boolean = false
): Promise<GymLesson[]> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const lessonsRef = collection(firestore, `users/${userId}/gym/lessons`);
  let q = query(lessonsRef, orderBy("date", "desc"));

  const snapshot = await getDocs(q);
  let lessons = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as GymLesson;
  });

  if (upcomingOnly) {
    const now = new Date();
    lessons = lessons.filter((lesson) => lesson.date > now);
  }

  return lessons;
};

export const updateLessonAttendance = async (
  userId: string,
  lessonId: string,
  attended: boolean
): Promise<void> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const lessonRef = doc(firestore, `users/${userId}/gym/lessons/${lessonId}`);
  const lessonSnap = await getDoc(lessonRef);
  
  if (lessonSnap.exists()) {
    const lessonData = lessonSnap.data() as GymLesson;
    await setDoc(
      lessonRef,
      {
        attended,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    // Create attendance record if attended
    if (attended) {
      await createAttendance(userId, {
        date: lessonData.date,
        lessonId,
        duration: 60, // Default 60 minutes for lessons
      });
    }
  }
};

// Attendance Helpers
const createAttendance = async (
  userId: string,
  attendance: Omit<GymAttendance, "id" | "createdAt">
): Promise<string> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const attendanceRef = collection(firestore, `users/${userId}/gym/attendance`);
  const docRef = doc(attendanceRef);
  
  await setDoc(docRef, {
    ...attendance,
    date: Timestamp.fromDate(attendance.date),
    createdAt: Timestamp.now(),
  });

  return docRef.id;
};

export const getAttendance = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<GymAttendance[]> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const attendanceRef = collection(firestore, `users/${userId}/gym/attendance`);
  let q = query(attendanceRef, orderBy("date", "desc"));

  const snapshot = await getDocs(q);
  let attendance = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as GymAttendance;
  });

  if (startDate) {
    attendance = attendance.filter((a) => a.date >= startDate);
  }
  if (endDate) {
    attendance = attendance.filter((a) => a.date <= endDate);
  }

  return attendance;
};

// Progress Helpers
export const createProgress = async (
  userId: string,
  progress: Omit<GymProgress, "id" | "createdAt">
): Promise<string> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const progressRef = collection(firestore, `users/${userId}/gym/progress`);
  const docRef = doc(progressRef);
  
  await setDoc(docRef, {
    ...progress,
    date: Timestamp.fromDate(progress.date),
    createdAt: Timestamp.now(),
  });

  return docRef.id;
};

export const getProgress = async (
  userId: string,
  metric?: GymProgress["metric"]
): Promise<GymProgress[]> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const progressRef = collection(firestore, `users/${userId}/gym/progress`);
  let q = query(progressRef, orderBy("date", "desc"));
  
  if (metric) {
    q = query(progressRef, where("metric", "==", metric), orderBy("date", "desc"));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as GymProgress;
  });
};

// Alert Helpers
export const createAlert = async (
  userId: string,
  alert: Omit<GymAlert, "id" | "createdAt">
): Promise<string> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const alertsRef = collection(firestore, `users/${userId}/gym/alerts`);
  const docRef = doc(alertsRef);
  
  await setDoc(docRef, {
    ...alert,
    date: Timestamp.fromDate(alert.date),
    resolved: false,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
};

export const getAlerts = async (
  userId: string,
  unresolvedOnly: boolean = true
): Promise<GymAlert[]> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const alertsRef = collection(firestore, `users/${userId}/gym/alerts`);
  let q = query(alertsRef, orderBy("createdAt", "desc"));

  if (unresolvedOnly) {
    q = query(alertsRef, where("resolved", "==", false), orderBy("createdAt", "desc"));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as GymAlert;
  });
};

export const resolveAlert = async (
  userId: string,
  alertId: string
): Promise<void> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const alertRef = doc(firestore, `users/${userId}/gym/alerts/${alertId}`);
  await setDoc(alertRef, { resolved: true }, { merge: true });
};

