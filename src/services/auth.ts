import { User, StoredUser, Role } from '../types';
import { db, hashPassword, verifyPassword, generateUUID } from './db';
import { sendGmailNotification } from './gmail';
import { isGoogleConnected } from './googleAuth';

const SESSION_KEY = 'brain_hub_session_user';
const EXPECTED_BOOTSTRAP_TOKEN = 'BH-BOOTSTRAP-SECURE-KEY-2026';

type AuthListener = (user: User | null) => void;
const authListeners: Set<AuthListener> = new Set();

function notifyAuth(user: User | null) {
  authListeners.forEach(fn => fn(user));
}

export function subscribeToAuth(listener: AuthListener) {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export const authService = {
  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as User;
      // Validate that user still exists in DB
      const dbUser = db.getUserById(user.id);
      return dbUser ? sanitizeUser(dbUser) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    notifyAuth(user);
  },

  registerResearcher(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    institution?: string;
    department?: string;
  }): { success: boolean; user?: User; error?: string } {
    const cleanEmail = data.email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please provide a valid email address (e.g. yourname@domain.com).' };
    }

    if (!data.firstName.trim() || !data.lastName.trim()) {
      return { success: false, error: 'First name and last name are required.' };
    }

    if (data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters in length.' };
    }

    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
    }

    const newUser: StoredUser = {
      id: generateUUID(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: cleanEmail,
      passwordHash: hashPassword(data.password),
      role: 'RESEARCHER',
      institution: data.institution?.trim() || 'Independent Scholar / Researcher',
      department: data.department ? data.department.trim() : undefined,
      emailVerified: true,
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    db.saveUser(newUser);
    const sanitized = sanitizeUser(newUser);
    db.recordAudit(sanitized, 'REGISTER_RESEARCHER', 'USER', sanitized.id, `Researcher ${sanitized.email} registered`);
    this.setCurrentUser(sanitized);

    // Initial welcome in-app notification
    db.createNotification({
      recipientUserId: newUser.id,
      type: 'ACCOUNT_WELCOME',
      title: 'Welcome to BRAIN HUB',
      message: 'Your researcher account is verified and ready. You will receive real-time notifications on all your manuscript submissions, peer reviews, and editorial statuses.',
      isRead: false,
    });

    // Send welcome email if Gmail connected
    if (isGoogleConnected()) {
      sendGmailNotification({
        toEmail: newUser.email,
        recipientName: `${newUser.firstName} ${newUser.lastName}`,
        subject: 'Welcome to BRAIN HUB Research Portal',
        headerTitle: 'Account Verified & Ready',
        bodyContent: `Hello ${newUser.firstName}, welcome to BRAIN HUB! Your researcher account has been activated. You can now submit research manuscripts, monitor editorial peer reviews, and receive device notifications whenever your publications change status.`
      }).catch(console.error);
    }

    return { success: true, user: sanitized };
  },

  bootstrapAdmin(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    institution: string;
    bootstrapToken: string;
  }): { success: boolean; user?: User; error?: string } {
    if (data.bootstrapToken !== EXPECTED_BOOTSTRAP_TOKEN) {
      return { success: false, error: 'Invalid administrator bootstrap authorization token.' };
    }

    const existing = db.getUserByEmail(data.email);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const newAdmin: StoredUser = {
      id: generateUUID(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      role: 'ADMIN',
      institution: data.institution.trim(),
      department: 'Editorial & Verification Board',
      emailVerified: true,
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    db.saveUser(newAdmin);
    const sanitized = sanitizeUser(newAdmin);
    db.recordAudit(sanitized, 'BOOTSTRAP_ADMIN', 'USER', sanitized.id, `Administrator ${sanitized.email} bootstrapped`);
    this.setCurrentUser(sanitized);

    return { success: true, user: sanitized };
  },

  createAdminByAdmin(adminActor: User, data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    institution: string;
    department?: string;
  }): { success: boolean; user?: User; error?: string } {
    if (adminActor.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Only active administrators can provision new administrator accounts.' };
    }

    const existing = db.getUserByEmail(data.email);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    if (data.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const newAdmin: StoredUser = {
      id: generateUUID(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      role: 'ADMIN',
      institution: data.institution.trim(),
      department: data.department ? data.department.trim() : 'Editorial Board',
      emailVerified: true,
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    db.saveUser(newAdmin);
    const sanitized = sanitizeUser(newAdmin);
    db.recordAudit(adminActor, 'PROVISION_ADMIN', 'USER', sanitized.id, `New administrator account created for ${sanitized.email}`);

    return { success: true, user: sanitized };
  },

  login(email: string, password: string): { success: boolean; user?: User; error?: string } {
    const user = db.getUserByEmail(email);
    if (!user) {
      db.recordAudit(null, 'LOGIN_FAILED', 'USER', undefined, `Failed login attempt for unknown email: ${email}`);
      return { success: false, error: 'Invalid email address or password.' };
    }

    if (!verifyPassword(password, user.passwordHash)) {
      db.recordAudit(sanitizeUser(user), 'LOGIN_FAILED', 'USER', user.id, 'Password mismatch');
      return { success: false, error: 'Invalid email address or password.' };
    }

    if (user.accountStatus !== 'ACTIVE') {
      return { success: false, error: `Account access is restricted (${user.accountStatus}).` };
    }

    user.lastLoginAt = new Date().toISOString();
    db.saveUser(user);

    const sanitized = sanitizeUser(user);
    db.recordAudit(sanitized, 'LOGIN_SUCCESS', 'USER', user.id, 'User session initiated');
    this.setCurrentUser(sanitized);

    return { success: true, user: sanitized };
  },

  logout(): void {
    const current = this.getCurrentUser();
    if (current) {
      db.recordAudit(current, 'LOGOUT', 'USER', current.id, 'Session ended');
    }
    this.setCurrentUser(null);
  },

  updateProfile(userId: string, data: { firstName: string; lastName: string; institution: string; department?: string }): User | null {
    const user = db.getUserById(userId);
    if (!user) return null;

    user.firstName = data.firstName.trim();
    user.lastName = data.lastName.trim();
    user.institution = data.institution.trim();
    user.department = data.department ? data.department.trim() : undefined;

    db.saveUser(user);
    const sanitized = sanitizeUser(user);
    this.setCurrentUser(sanitized);
    db.recordAudit(sanitized, 'UPDATE_PROFILE', 'USER', user.id, 'Profile updated');
    return sanitized;
  },

  changePassword(userId: string, currentPass: string, newPass: string): { success: boolean; error?: string } {
    const user = db.getUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    if (!verifyPassword(currentPass, user.passwordHash)) {
      return { success: false, error: 'Current password does not match.' };
    }

    user.passwordHash = hashPassword(newPass);
    db.saveUser(user);
    db.recordAudit(sanitizeUser(user), 'CHANGE_PASSWORD', 'USER', user.id, 'Password changed');
    return { success: true };
  }
};

function sanitizeUser(stored: StoredUser): User {
  const { passwordHash, ...safe } = stored;
  return safe;
}
