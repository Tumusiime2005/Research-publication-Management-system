import { User, StoredUser, Role } from '../types';
import { db, hashPassword, verifyPassword, generateUUID } from './db';

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
    institution: string;
    department?: string;
  }): { success: boolean; user?: User; error?: string } {
    const existing = db.getUserByEmail(data.email);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists in the system.' };
    }

    const newUser: StoredUser = {
      id: generateUUID(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      role: 'RESEARCHER',
      institution: data.institution.trim(),
      department: data.department ? data.department.trim() : undefined,
      emailVerified: true,
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    db.saveUser(newUser);
    const sanitized = sanitizeUser(newUser);
    db.recordAudit(sanitized, 'REGISTER_RESEARCHER', 'USER', sanitized.id, `Researcher ${sanitized.email} registered`);
    this.setCurrentUser(sanitized);

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
