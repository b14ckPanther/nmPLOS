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
  // Access nested collection: users/{userId}/gmail/messages
  // Client SDK uses: collection(firestore, 'users/${userId}/gmail/messages')
  // For this to be a valid collection path, gmail must be a document
  // Structure: users (collection) -> {userId} (doc) -> gmail (doc) -> messages (subcollection)
  
  // Access messages collection: users/{userId}/gmail/messages
  // The path users/{userId}/gmail/messages should work as a collection
  // But Admin SDK requires proper chaining. Since gmail is a collection (based on tokens),
  // we need messages to be a subcollection of a document within gmail.
  // However, the client expects: users/{userId}/gmail/messages as a direct collection path.
  // Let's use the collection path that matches the client structure exactly.
  // We'll store messages as documents in a collection structure that matches the client path.
  
  // Actually, looking at the error, the issue is the path has 4 components (even) = document path
  // But we need a collection path (odd components). 
  // The client path `users/${userId}/gmail/messages` has 4 components, so it's treated as a document.
  // To make it a collection, we need: users/{userId}/gmail/{doc}/messages = 5 components
  // So let's create a data document under gmail, then messages as its subcollection
  const gmailDataDocRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("gmail")
    .doc("data");
  
  // Ensure the data document exists (subcollections need parent documents)
  await gmailDataDocRef.set({ _exists: true }, { merge: true });
  
  // Access messages as subcollection of the data document
  const messagesRef = gmailDataDocRef.collection("messages");
  
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

