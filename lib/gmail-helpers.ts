import { db } from "@/firebase/client";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp 
} from "firebase/firestore";
import type { GmailMessage } from "@/firebase/types";

// Gmail OAuth token structure
export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
}

// Store Gmail tokens for a user
export const storeGmailTokens = async (
  userId: string,
  tokens: GmailTokens
): Promise<void> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const tokensRef = doc(firestore, `users/${userId}/gmail/tokens`);
  await setDoc(tokensRef, {
    ...tokens,
    updatedAt: Timestamp.now(),
  });
};

// Get Gmail tokens for a user
export const getGmailTokens = async (
  userId: string
): Promise<GmailTokens | null> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const tokensRef = doc(firestore, `users/${userId}/gmail/tokens`);
  const tokensSnap = await getDoc(tokensRef);

  if (!tokensSnap.exists()) {
    return null;
  }

  const data = tokensSnap.data();
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiryDate: data.expiryDate,
    scope: data.scope,
  };
};

// Delete Gmail tokens (for disconnect)
export const deleteGmailTokens = async (userId: string): Promise<void> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const tokensRef = doc(firestore, `users/${userId}/gmail/tokens`);
  await setDoc(tokensRef, {}, { merge: false });
};

// Store Gmail message in Firestore
export const storeGmailMessage = async (
  userId: string,
  message: Omit<GmailMessage, "id">
): Promise<string> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const messagesRef = collection(firestore, `users/${userId}/gmail/data/messages`);
  
  // Check if message already exists by gmailId
  const existingQuery = query(
    messagesRef,
    where("gmailId", "==", message.gmailId)
  );
  const existingSnap = await getDocs(existingQuery);

  let docId: string;
  if (!existingSnap.empty) {
    // Update existing message
    docId = existingSnap.docs[0].id;
    const docRef = doc(firestore, `users/${userId}/gmail/data/messages/${docId}`);
    await setDoc(docRef, {
      ...message,
      date: Timestamp.fromDate(message.date),
      syncedAt: Timestamp.fromDate(message.syncedAt),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } else {
    // Create new message
    const docRef = doc(messagesRef);
    docId = docRef.id;
    await setDoc(docRef, {
      ...message,
      date: Timestamp.fromDate(message.date),
      syncedAt: Timestamp.fromDate(message.syncedAt),
      createdAt: Timestamp.now(),
    });
  }

  return docId;
};

// Get Gmail messages from Firestore
export const getGmailMessages = async (
  userId: string,
  category?: string
): Promise<GmailMessage[]> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const messagesRef = collection(firestore, `users/${userId}/gmail/data/messages`);
  let q = query(messagesRef, orderBy("date", "desc"));

  if (category && category !== "other") {
    q = query(q, where("category", "==", category));
  } else if (category === "other") {
    q = query(q, where("category", "==", "other"));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      gmailId: data.gmailId,
      subject: data.subject,
      from: data.from,
      date: data.date?.toDate() || new Date(),
      label: data.label,
      category: data.category,
      body: data.body,
      attachments: data.attachments,
      syncedAt: data.syncedAt?.toDate() || new Date(),
    } as GmailMessage;
  });
};

// Get email count by category
export const getEmailCountsByCategory = async (
  userId: string
): Promise<Record<string, number>> => {
  const firestore = db;
  if (!firestore) throw new Error("Firestore not initialized");

  const messagesRef = collection(firestore, `users/${userId}/gmail/data/messages`);
  const snapshot = await getDocs(messagesRef);

  const counts: Record<string, number> = {
    bills: 0,
    assignments: 0,
    projects: 0,
    receipts: 0,
    banking: 0,
    university: 0,
    other: 0,
  };

  snapshot.docs.forEach((doc) => {
    const category = doc.data().category || "other";
    if (category in counts) {
      counts[category]++;
    } else {
      counts.other++;
    }
  });

  return counts;
};

