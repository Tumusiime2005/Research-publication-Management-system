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
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Publication, StoredUser, User, Notification } from '../types';
import { hashPassword } from './db';

// Initialize Firebase App & Firestore
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export const PRIMARY_ADMIN_EMAIL = 'tumusiimeeltonmarvin@gmail.com';

export const INITIAL_MAIN_ADMIN: StoredUser = {
  id: 'admin-maron-prime-main',
  firstName: 'Elton Marvin',
  lastName: 'Tumusiime',
  email: PRIMARY_ADMIN_EMAIL,
  passwordHash: hashPassword('password2005'),
  role: 'ADMIN',
  institution: 'Maron Prime Systems Institute',
  department: 'Executive Editorial & Verification Board',
  emailVerified: true,
  accountStatus: 'ACTIVE',
  createdAt: new Date().toISOString()
};

let publicationsUnsub: Unsubscribe | null = null;
let usersUnsub: Unsubscribe | null = null;
let isInitialized = false;

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
 * Sync a single publication document to Firestore
 */
export async function savePublicationToFirestore(pub: Publication): Promise<void> {
  try {
    const pubRef = doc(firestore, 'publications', pub.id);
    await setDoc(pubRef, pub, { merge: true });
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
 * Initialize live synchronization with Firestore across all devices
 */
export function initFirestoreSync(
  onPublicationsUpdated: (pubs: Publication[]) => void,
  onUsersUpdated: (users: StoredUser[]) => void
): () => void {
  if (isInitialized) {
    return () => {};
  }
  isInitialized = true;

  // 1. Listen to all publications in real-time
  const pubsCollection = collection(firestore, 'publications');
  publicationsUnsub = onSnapshot(
    pubsCollection,
    (snapshot) => {
      if (!snapshot.empty) {
        const pubs: Publication[] = [];
        snapshot.forEach((d) => {
          pubs.push(d.data() as Publication);
        });
        // Sort newest first
        pubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onPublicationsUpdated(pubs);
      }
    },
    (error) => {
      console.warn('Firestore publications sync warning:', error);
    }
  );

  // 2. Listen to users collection in real-time
  const usersCollection = collection(firestore, 'users');
  usersUnsub = onSnapshot(
    usersCollection,
    (snapshot) => {
      if (!snapshot.empty) {
        const users: StoredUser[] = [];
        snapshot.forEach((d) => {
          users.push(d.data() as StoredUser);
        });
        onUsersUpdated(users);
      }
    },
    (error) => {
      console.warn('Firestore users sync warning:', error);
    }
  );

  // 3. Ensure primary admin exists in Firestore
  ensurePrimaryAdminInFirestore();

  return () => {
    if (publicationsUnsub) publicationsUnsub();
    if (usersUnsub) usersUnsub();
    isInitialized = false;
  };
}

/**
 * Ensure the main admin account is present in Firestore
 */
async function ensurePrimaryAdminInFirestore() {
  try {
    const adminRef = doc(firestore, 'users', INITIAL_MAIN_ADMIN.id);
    await setDoc(adminRef, INITIAL_MAIN_ADMIN, { merge: true });
  } catch (err) {
    console.error('Error ensuring primary admin in Firestore:', err);
  }
}
