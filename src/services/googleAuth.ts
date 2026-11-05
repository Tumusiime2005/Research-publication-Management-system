import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
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
 * Ensures the Google Identity Services (GIS) client script is loaded
 */
function ensureGsiClientLoaded(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).google?.accounts?.oauth2) {
      resolve(true);
      return;
    }
    const existing = document.getElementById('gsi-client-script');
    if (existing) {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if ((window as any).google?.accounts?.oauth2) {
          clearInterval(interval);
          resolve(true);
        } else if (checks > 20) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Helper to register or sync a Google account into the BRAIN HUB database & session
 */
function recordGoogleUserInDb(profile: GoogleUserProfile): User {
  const email = profile.email.toLowerCase().trim();
  const isMainAdmin = email === 'tumusiimeeltonmarvin@gmail.com';

  const firstName = profile.firstName || profile.name.split(' ')[0] || 'Researcher';
  const lastName = profile.lastName || profile.name.split(' ').slice(1).join(' ') || 'GoogleUser';

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
 * Sign in or Register using Google Identity Services (GIS) token client.
 * Uses the OAuth Client ID directly, bypassing Firebase Auth domain restrictions.
 */
function requestGsiToken(): Promise<{ token: string; profile: GoogleUserProfile }> {
  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services SDK is not loaded.'));
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId,
        scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        prompt: 'select_account',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('No access token received from Google.'));
            return;
          }

          try {
            // Fetch Google user profile with access token
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!res.ok) {
              throw new Error(`Failed to retrieve Google profile: ${res.statusText}`);
            }

            const data = await res.json();
            const profile: GoogleUserProfile = {
              email: data.email,
              name: data.name || data.given_name || 'Google Researcher',
              firstName: data.given_name,
              lastName: data.family_name,
              picture: data.picture,
            };

            resolve({ token: accessToken, profile });
          } catch (err: any) {
            reject(err);
          }
        },
        error_callback: (nonOAuthErr: any) => {
          reject(new Error(nonOAuthErr?.message || 'Google Sign-in window closed or popup blocked.'));
        },
      });

      client.requestAccessToken();
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Primary Google Sign-in / Registration function.
 * Uses Google Identity Services (GIS) with automatic fallback and Firebase Auth bridging.
 */
export const signInWithGoogle = async (): Promise<{
  user: User;
  firebaseUser?: FirebaseUser | null;
  accessToken: string;
}> => {
  isSigningIn = true;
  try {
    // 1. Try Google Identity Services (GIS) first as it avoids Firebase Auth domain whitelist constraints
    const gsiLoaded = await ensureGsiClientLoaded();
    if (gsiLoaded && (window as any).google?.accounts?.oauth2) {
      try {
        const { token, profile } = await requestGsiToken();
        cachedAccessToken = token;
        cachedGoogleProfile = profile;

        const safeUser = recordGoogleUserInDb(profile);

        // Optionally bridge to Firebase Auth if credential can be linked (silent fallback if unauthorized domain)
        let fbUser: FirebaseUser | null = null;
        try {
          const cred = GoogleAuthProvider.credential(null, token);
          const userCred = await signInWithCredential(auth, cred);
          fbUser = userCred.user;
        } catch (fbErr: any) {
          // Log benign domain or config warning without interrupting the user's login
          console.info('Firebase Auth domain linking skipped; Google OAuth token active.', fbErr?.code || fbErr?.message);
        }

        notifyGoogleAuth(true, fbUser);
        return {
          user: safeUser,
          firebaseUser: fbUser,
          accessToken: token,
        };
      } catch (gsiErr: any) {
        console.warn('GIS Token client completed with notice:', gsiErr?.message);
        // If user cancelled, rethrow so UI can handle it cleanly
        if (gsiErr?.message?.includes('closed') || gsiErr?.message?.includes('cancelled')) {
          throw new Error('Google sign-in popup was closed before completing.');
        }
        // If GIS had another error, fall through to try Firebase popup
      }
    }

    // 2. Fallback to Firebase Auth popup
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || '';
      cachedAccessToken = token || 'firebase_authenticated_session';

      const fbUser = result.user;
      const profile: GoogleUserProfile = {
        email: fbUser.email || '',
        name: fbUser.displayName || 'Google Researcher',
        picture: fbUser.photoURL || undefined,
      };
      cachedGoogleProfile = profile;

      const safeUser = recordGoogleUserInDb(profile);
      notifyGoogleAuth(true, fbUser);

      return {
        user: safeUser,
        firebaseUser: fbUser,
        accessToken: cachedAccessToken,
      };
    } catch (fbErr: any) {
      const code = fbErr?.code || '';
      if (code === 'auth/unauthorized-domain') {
        throw new Error(
          'Google Sign-In Domain Note: This preview domain is waiting for Firebase Auth domain whitelist. You can register instantly using the email form below with your Google address.'
        );
      } else if (code === 'auth/popup-blocked') {
        throw new Error(
          'Google sign-in popup was blocked by your browser. Please allow popups or register directly with your email below.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in window was closed.');
      } else if (code === 'auth/operation-not-allowed') {
        throw new Error(
          'Google authentication provider is not configured in Firebase console. Please register with your email address below.'
        );
      }
      throw new Error(fbErr?.message || 'Google authentication failed.');
    }
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
