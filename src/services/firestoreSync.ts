import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Publication, StoredUser, Notification } from '../types';
import { hashPassword } from './utils';

// Initialize Firebase App & Firestore
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export const PRIMARY_ADMIN_EMAIL = 'tumusiimeeltonmarvin@gmail.com';
export const RESET_ADMIN_DEFAULT_PASSWORD = 'BrainHubAdmin@2026';
const RESET_MARKER_DOC_ID = 'reset_v4_2026_11_13';

export const INITIAL_MAIN_ADMIN: StoredUser = {
  id: 'admin-maron-prime-main',
  firstName: 'Elton Marvin',
  lastName: 'Tumusiime',
  email: PRIMARY_ADMIN_EMAIL,
  passwordHash: hashPassword(RESET_ADMIN_DEFAULT_PASSWORD),
  role: 'ADMIN',
  institution: 'Maron Prime Systems Institute',
  department: 'Executive Editorial Administration',
  emailVerified: true,
  accountStatus: 'ACTIVE',
  createdAt: new Date().toISOString(),
};

let publicationsUnsub: Unsubscribe | null = null;
let usersUnsub: Unsubscribe | null = null;
let notificationsUnsub: Unsubscribe | null = null;
let isInitialized = false;
let resetChecked = false;

/**
 * Test connectivity with Firestore server
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline, working with cached data');
    }
    return false;
  }
}

/**
 * One-time global account & admin password reset in Firestore
 */
export async function performGlobalResetIfNeeded(): Promise<void> {
  if (resetChecked) return;
  resetChecked = true;

  try {
    const markerRef = doc(firestore, 'system', RESET_MARKER_DOC_ID);
    const markerSnap = await getDocFromServer(markerRef);
    if (markerSnap.exists()) {
      return;
    }

    // Delete all existing accounts in Firestore
    const existingUsers = await getDocs(collection(firestore, 'users'));
    await Promise.all(
      existingUsers.docs.map((d) => deleteDoc(doc(firestore, 'users', d.id)))
    );

    // Clear old notifications so legacy accounts don't leave orphaned alerts
    const existingNotifs = await getDocs(collection(firestore, 'notifications'));
    await Promise.all(
      existingNotifs.docs.map((d) => deleteDoc(doc(firestore, 'notifications', d.id)))
    );

    // Seed fresh primary admin with newly reset password
    await setDoc(doc(firestore, 'users', INITIAL_MAIN_ADMIN.id), INITIAL_MAIN_ADMIN);

    // Record completion marker so future boots do not re-wipe accounts
    await setDoc(markerRef, {
      completedAt: new Date().toISOString(),
      primaryAdminEmail: PRIMARY_ADMIN_EMAIL,
    });
  } catch (err) {
    console.warn('Global Firestore reset check warning:', err);
  }
}

/**
 * Sync a single publication document to Firestore
 */
export async function savePublicationToFirestore(pub: Publication): Promise<void> {
  try {
    const pubRef = doc(firestore, 'publications', pub.id);
    const byteLength = new TextEncoder().encode(JSON.stringify(pub)).length;
    if (byteLength > 900_000) {
      const { documentData: _omitted, ...metadataOnly } = pub;
      console.warn(
        `Publication "${pub.title}" payload (${byteLength} bytes) exceeds Firestore 1MB limit; syncing metadata without embedded binary.`
      );
      await setDoc(pubRef, metadataOnly, { merge: true });
    } else {
      await setDoc(pubRef, pub, { merge: true });
    }
  } catch (err) {
    console.error('Error saving publication to Firestore:', err);
  }
}

/**
 * Remove a publication document from Firestore
 */
export async function deletePublicationFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, 'publications', id));
  } catch (err) {
    console.error('Error deleting publication from Firestore:', err);
  }
}

/**
 * Sync user profile to Firestore
 */
export async function saveUserToFirestore(user: StoredUser): Promise<void> {
  try {
    const userRef = doc(firestore, 'users', user.id);
    await setDoc(userRef, user, { merge: true });
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
  }
}

/**
 * Delete user account from Firestore
 */
export async function deleteUserFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, 'users', id));
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
  }
}

/**
 * Sync notification to Firestore
 */
export async function saveNotificationToFirestore(notif: Notification): Promise<void> {
  try {
    const notifRef = doc(firestore, 'notifications', notif.id);
    await setDoc(notifRef, notif, { merge: true });
  } catch (err) {
    console.error('Error saving notification to Firestore:', err);
  }
}

/**
 * Initialize live synchronization with Firestore across User System & Separate Admin Dashboard
 */
export function initFirestoreSync(
  onPublicationsUpdated: (pubs: Publication[], authoritative: boolean) => void,
  onUsersUpdated: (users: StoredUser[], authoritative: boolean) => void,
  onNotificationsUpdated?: (notifs: Notification[], authoritative: boolean) => void
): () => void {
  if (isInitialized) {
    return () => {};
  }
  isInitialized = true;

  // Test connection and perform one-time reset if needed
  testFirestoreConnection().then((online) => {
    if (online) {
      performGlobalResetIfNeeded();
    }
  });

  // 1. Real-time listener for all publications
  const pubsCollection = collection(firestore, 'publications');
  publicationsUnsub = onSnapshot(
    pubsCollection,
    (snapshot) => {
      const pubs: Publication[] = [];
      snapshot.forEach((d) => {
        pubs.push(d.data() as Publication);
      });
      pubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const authoritative = !snapshot.metadata.fromCache;
      if (authoritative || !snapshot.empty) {
        onPublicationsUpdated(pubs, authoritative);
      }
    },
    (error) => {
      console.warn('Firestore publications sync warning:', error);
    }
  );

  // 2. Real-time listener for all user accounts (links User App & Admin Dashboard)
  const usersCollection = collection(firestore, 'users');
  usersUnsub = onSnapshot(
    usersCollection,
    (snapshot) => {
      const users: StoredUser[] = [];
      snapshot.forEach((d) => {
        users.push(d.data() as StoredUser);
      });
      const authoritative = !snapshot.metadata.fromCache;
      if (authoritative || !snapshot.empty) {
        onUsersUpdated(users, authoritative);
      }
    },
    (error) => {
      console.warn('Firestore users sync warning:', error);
    }
  );

  // 3. Real-time listener for notifications across devices
  const notifsCollection = collection(firestore, 'notifications');
  notificationsUnsub = onSnapshot(
    notifsCollection,
    (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((d) => {
        notifs.push(d.data() as Notification);
      });
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const authoritative = !snapshot.metadata.fromCache;
      if (onNotificationsUpdated && (authoritative || !snapshot.empty)) {
        onNotificationsUpdated(notifs, authoritative);
      }
    },
    (error) => {
      console.warn('Firestore notifications sync warning:', error);
    }
  );

  return () => {
    if (publicationsUnsub) publicationsUnsub();
    if (usersUnsub) usersUnsub();
    if (notificationsUnsub) notificationsUnsub();
    isInitialized = false;
  };
}
