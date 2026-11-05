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
  prompt: 'select_account',
});

export interface GoogleUserProfile {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

// In-memory token and profile cache (never stored in localStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleProfile: GoogleUserProfile | null = null;
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
        notifyGoogleAuth(false, fbUser);
        if (onFailure) onFailure();
      }
    } else {
      if (!cachedAccessToken) {
        notifyGoogleAuth(false, null);
        if (onFailure) onFailure();
      }
    }
  });
};

/**
 * Registers or synchronizes a Google-authenticated account into the BRAIN HUB DB & session
 */
function recordGoogleUserInDb(profile: GoogleUserProfile): User {
  const email = profile.email.toLowerCase().trim();
  const isMainAdmin = email === 'tumusiimeeltonmarvin@gmail.com';

  const firstName = profile.firstName || profile.name.split(' ')[0] || 'Researcher';
  const lastName = profile.lastName || profile.name.split(' ').slice(1).join(' ') || 'Account';

  let user = db.getUserByEmail(email);

  if (!user) {
    const newUser: StoredUser = {
      id: isMainAdmin ? 'admin-maron-prime-main' : generateUUID(),
      firstName: isMainAdmin ? 'Elton Marvin' : firstName,
      lastName: isMainAdmin ? 'Tumusiime' : lastName,
      email,
      passwordHash: hashPassword(generateUUID() + '_google_auth_key'),
      role: isMainAdmin ? 'ADMIN' : 'RESEARCHER',
      institution: isMainAdmin ? 'Maron Prime Systems Institute' : 'Academic Research Network',
      department: isMainAdmin ? 'Executive Editorial Board' : 'Verified Google Account',
      profilePhotoUrl: profile.picture,
      emailVerified: true,
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    db.saveUser(newUser);
    user = newUser;

    db.createNotification({
      recipientUserId: newUser.id,
      type: 'ACCOUNT_WELCOME',
      title: 'Welcome to BRAIN HUB',
      message: 'Your Google-authenticated researcher account is active. You will receive notifications for all your research submissions and editorial decisions.',
      isRead: false,
    });

    db.recordAudit(
      newUser,
      'REGISTER_GOOGLE_ACCOUNT',
      'USER',
      newUser.id,
      `Real account created via Google OAuth (${email}) with role ${newUser.role}`
    );
  } else {
    if (isMainAdmin) {
      user.role = 'ADMIN';
      user.institution = 'Maron Prime Systems Institute';
    }
    if (profile.picture && !user.profilePhotoUrl) {
      user.profilePhotoUrl = profile.picture;
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
  return safeUser;
}

/**
 * Sign in or Register a real researcher account using Google & Gmail
 * Uses Firebase Authentication GoogleAuthProvider with Workspace scopes
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
    const token = credential?.accessToken || 'firebase_google_session';

    cachedAccessToken = token;
    const fbUser = result.user;
    const email = fbUser.email?.toLowerCase().trim() || '';

    const displayName = fbUser.displayName || 'Researcher';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || 'Researcher';
    const lastName = nameParts.slice(1).join(' ') || 'Account';

    const profile: GoogleUserProfile = {
      email,
      name: displayName,
      firstName,
      lastName,
      picture: fbUser.photoURL || undefined,
    };
    cachedGoogleProfile = profile;

    const safeUser = recordGoogleUserInDb(profile);
    notifyGoogleAuth(true, fbUser);

    return {
      user: safeUser,
      firebaseUser: fbUser,
      accessToken: token,
    };
  } catch (error: any) {
    const code = error?.code || '';
    const msg = error?.message || '';

    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        'Google OAuth Domain Notice: This hosting domain is waiting for authorization in the Google Cloud / Firebase Console. You can create your account immediately using the email registration form below!'
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error(
        'The Google sign-in popup was blocked by your browser. Please allow popups or register directly with your email below.'
      );
    }
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in window was closed before completion.');
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error(
        'Google sign-in provider is not enabled in Firebase Console. You can register directly with your email below.'
      );
    }
    if (msg.includes('origin_mismatch') || code === '400') {
      throw new Error(
        'Google OAuth Origin Mismatch: This web address is not yet registered in Google Cloud Console OAuth Authorized Origins. Please use the direct email registration form below to create your account instantly!'
      );
    }

    throw new Error(error?.message || 'Google authentication failed.');
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getGoogleUserProfile = (): GoogleUserProfile | null => {
  return cachedGoogleProfile;
};

export const isGoogleConnected = (): boolean => {
  return Boolean(cachedAccessToken);
};

export const signOutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signOut notice:', e);
  } finally {
    cachedAccessToken = null;
    cachedGoogleProfile = null;
    notifyGoogleAuth(false, null);
  }
};
