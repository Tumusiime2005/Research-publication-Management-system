import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, StoredUser } from '../types';
import { db, hashPassword, generateUUID } from './db';
import { authService } from './auth';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider with Workspace Gmail & Profile scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// Cache the access token strictly in memory (never localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

type GoogleAuthListener = (isConnected: boolean, user: FirebaseUser | null) => void;
const listeners = new Set<GoogleAuthListener>();

export function subscribeToGoogleAuth(listener: GoogleAuthListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyGoogleAuth(isConnected: boolean, user: FirebaseUser | null) {
  listeners.forEach(fn => fn(isConnected, user));
}

// Initialize Auth Listener on application launch
export const initGoogleAuth = (
  onSuccess?: (user: FirebaseUser, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      if (cachedAccessToken) {
        notifyGoogleAuth(true, fbUser);
        if (onSuccess) onSuccess(fbUser, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        notifyGoogleAuth(false, fbUser);
        if (onFailure) onFailure();
      }
    } else {
      cachedAccessToken = null;
      notifyGoogleAuth(false, null);
      if (onFailure) onFailure();
    }
  });
};

/**
 * Sign in or Register a real researcher account using Google & Gmail
 */
export const signInWithGoogle = async (): Promise<{
  user: User;
  firebaseUser: FirebaseUser;
  accessToken: string;
}> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Gmail access token.');
    }

    cachedAccessToken = credential.accessToken;
    const fbUser = result.user;
    const email = fbUser.email?.toLowerCase().trim() || '';

    // Check if user already exists in BRAIN HUB DB
    let user = db.getUserByEmail(email);

    const displayName = fbUser.displayName || 'Researcher';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || 'Researcher';
    const lastName = nameParts.slice(1).join(' ') || 'Account';

    if (!user) {
      // Create a new real researcher account
      const newUser: StoredUser = {
        id: generateUUID(),
        firstName,
        lastName,
        email,
        passwordHash: hashPassword(generateUUID() + '_google_auth'),
        role: 'RESEARCHER',
        institution: 'Academic Research Network',
        department: 'Verified Google Workspace Member',
        profilePhotoUrl: fbUser.photoURL || undefined,
        emailVerified: true,
        accountStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      db.saveUser(newUser);
      user = newUser;
      db.recordAudit(
        user,
        'REGISTER_GOOGLE_ACCOUNT',
        'USER',
        user.id,
        `Real account created via Google Workspace (${email})`
      );
    } else {
      // Update photo or verification if needed
      if (fbUser.photoURL && !user.profilePhotoUrl) {
        user.profilePhotoUrl = fbUser.photoURL;
      }
      user.emailVerified = true;
      user.lastLoginAt = new Date().toISOString();
      db.saveUser(user);
      db.recordAudit(
        user,
        'LOGIN_GOOGLE_ACCOUNT',
        'USER',
        user.id,
        `Signed in with Google Account (${email})`
      );
    }

    const { passwordHash, ...safeUser } = user;
    authService.setCurrentUser(safeUser);
    notifyGoogleAuth(true, fbUser);

    return {
      user: safeUser,
      firebaseUser: fbUser,
      accessToken: cachedAccessToken,
    };
  } catch (error: any) {
    console.error('Google Sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const isGoogleConnected = (): boolean => {
  return !!cachedAccessToken && !!auth.currentUser;
};

export const signOutGoogle = async () => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    notifyGoogleAuth(false, null);
  }
};
