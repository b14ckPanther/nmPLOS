import { db } from "@/firebase/client";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import type { SidebarPreferences, SidebarCategory } from "@/firebase/types";

export const getSidebarPreferences = async (
  userId: string
): Promise<SidebarPreferences | null> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const prefsRef = doc(firestore, `users/${userId}/settings/sidebar`);
  const prefsSnap = await getDoc(prefsRef);

  if (!prefsSnap.exists()) {
    return null;
  }

  const data = prefsSnap.data();
  return {
    categories: data.categories || [],
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

export const saveSidebarPreferences = async (
  userId: string,
  categories: SidebarCategory[]
): Promise<void> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const prefsRef = doc(firestore, `users/${userId}/settings/sidebar`);
  await setDoc(
    prefsRef,
    {
      categories,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
};

