import { adminDb } from "@/firebase/admin";
import type { GmailMessage } from "@/firebase/types";
import { FieldValue } from "firebase-admin/firestore";

// Gmail OAuth token structure
export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
}

// Store Gmail tokens for a user (server-side)
export const storeGmailTokensServer = async (
  userId: string,
  tokens: GmailTokens
): Promise<void> => {
  await adminDb.collection("users").doc(userId).collection("gmail").doc("tokens").set({
    ...tokens,
    updatedAt: FieldValue.serverTimestamp(),
  });
};

// Get Gmail tokens for a user (server-side)
export const getGmailTokensServer = async (
  userId: string
): Promise<GmailTokens | null> => {
  const tokensSnap = await adminDb.collection("users").doc(userId).collection("gmail").doc("tokens").get();

  if (!tokensSnap.exists) {
    return null;
  }

  const data = tokensSnap.data();
  return {
    accessToken: data!.accessToken,
    refreshToken: data!.refreshToken,
    expiryDate: data!.expiryDate,
    scope: data!.scope || "",
  };
};

// Store Gmail message in Firestore (server-side)
export const storeGmailMessageServer = async (
  userId: string,
  message: Omit<GmailMessage, "id">
): Promise<string> => {
  const messagesRef = adminDb.collection("users").doc(userId).collection("gmail").collection("messages");
  
  // Check if message already exists by gmailId
  const existingQuery = await messagesRef
    .where("gmailId", "==", message.gmailId)
    .limit(1)
    .get();

  let docId: string;
  if (!existingQuery.empty) {
    // Update existing message
    docId = existingQuery.docs[0].id;
    await messagesRef.doc(docId).set(
      {
        ...message,
        date: message.date,
        syncedAt: message.syncedAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    // Create new message
    const docRef = messagesRef.doc();
    docId = docRef.id;
    await docRef.set({
      ...message,
      date: message.date,
      syncedAt: message.syncedAt,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return docId;
};

