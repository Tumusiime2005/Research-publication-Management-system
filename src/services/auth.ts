import { User, StoredUser } from '../types';
import { db, hashPassword, verifyPassword, generateUUID } from './db';

const USER_SESSION_KEY = 'brain_hub_session_user';
const ADMIN_SESSION_KEY = 'brain_hub_admin_session';

type AuthListener = (user: User | null) => void;
const authListeners: Set<AuthListener> = new Set();
const adminAuthListeners: Set<AuthListener> = new Set();

function notifyAuth(user: User | null) {
  authListeners.forEach(fn => fn(user));
}

function notifyAdminAuth(user: User | null) {
  adminAuthListeners.forEach(fn => fn(user));
}

export function subscribeToAuth(listener: AuthListener) {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export function subscribeToAdminAuth(listener: AuthListener) {
  adminAuthListeners.add(listener);
  return () => {
    adminAuthListeners.delete(listener);
  };
}

export const authService = {
  // --- USER PORTAL SESSION ---
  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_SESSION_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as User;
      const dbUser = db.getUserById(user.id);
      if (!dbUser) return null;
      return sanitizeUser(dbUser);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
    notifyAuth(user);
  },

  syncActiveSessionsWithDb(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      notifyAuth(currentUser);
    } else if (localStorage.getItem(USER_SESSION_KEY)) {
      this.setCurrentUser(null);
    }

    const currentAdmin = this.getCurrentAdmin();
    if (currentAdmin) {
      notifyAdminAuth(currentAdmin);
    } else if (localStorage.getItem(ADMIN_SESSION_KEY)) {
      this.setCurrentAdmin(null);
    }
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

    // Newly registered user starts in PENDING status until verified by the Separate Admin Dashboard
    const newUser: StoredUser = {
      id: generateUUID(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: cleanEmail,
      passwordHash: hashPassword(data.password),
      role: 'RESEARCHER',
      institution: data.institution?.trim() || 'Independent Scholar / Researcher',
      department: data.department ? data.department.trim() : undefined,
      emailVerified: false,
      accountStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    db.saveUser(newUser);
    const sanitized = sanitizeUser(newUser);
    db.recordAudit(sanitized, 'REGISTER_RESEARCHER', 'USER', sanitized.id, `Researcher ${sanitized.email} registered (Pending Admin Verification)`);
    this.setCurrentUser(sanitized);

    // Notify researcher of pending verification
    db.createNotification({
      recipientUserId: newUser.id,
      type: 'ACCOUNT_PENDING',
      title: 'Account Created — Pending Verification',
      message: 'Your researcher account has been submitted to the Administrator Dashboard for verification. You will be notified as soon as your account is verified.',
      isRead: false,
    });

    // Notify administrators in the Admin Dashboard
    const admins = db.getUsers().filter(u => u.role === 'ADMIN');
    admins.forEach(admin => {
      db.createNotification({
        recipientUserId: admin.id,
        type: 'NEW_ACCOUNT_REQUEST',
        title: 'New Account Awaiting Verification',
        message: `${newUser.firstName} ${newUser.lastName} (${newUser.email}) registered and requires admin verification.`,
        isRead: false,
      });
    });

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

    if (user.accountStatus === 'SUSPENDED') {
      return { success: false, error: 'Your account has been suspended by the system administrator.' };
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

  // --- SEPARATE ADMIN DASHBOARD SESSION & CONTROLS ---
  getCurrentAdmin(): User | null {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!raw) return null;
      const admin = JSON.parse(raw) as User;
      const dbUser = db.getUserById(admin.id);
      if (!dbUser || dbUser.role !== 'ADMIN') return null;
      return sanitizeUser(dbUser);
    } catch {
      return null;
    }
  },

  setCurrentAdmin(admin: User | null): void {
    if (admin) {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
    } else {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    notifyAdminAuth(admin);
  },

  loginAdmin(email: string, password: string): { success: boolean; user?: User; error?: string } {
    const user = db.getUserByEmail(email);
    if (!user || user.role !== 'ADMIN') {
      db.recordAudit(null, 'ADMIN_LOGIN_FAILED', 'ADMIN', undefined, `Unauthorized admin login attempt for ${email}`);
      return { success: false, error: 'Invalid administrator credentials.' };
    }

    if (!verifyPassword(password, user.passwordHash)) {
      db.recordAudit(sanitizeUser(user), 'ADMIN_LOGIN_FAILED', 'ADMIN', user.id, 'Admin password mismatch');
      return { success: false, error: 'Invalid administrator credentials.' };
    }

    user.lastLoginAt = new Date().toISOString();
    db.saveUser(user);

    const sanitized = sanitizeUser(user);
    db.recordAudit(sanitized, 'ADMIN_LOGIN_SUCCESS', 'ADMIN', user.id, 'Separate Admin Portal session started');
    this.setCurrentAdmin(sanitized);

    return { success: true, user: sanitized };
  },

  logoutAdmin(): void {
    const current = this.getCurrentAdmin();
    if (current) {
      db.recordAudit(current, 'ADMIN_LOGOUT', 'ADMIN', current.id, 'Admin session ended');
    }
    this.setCurrentAdmin(null);
  },

  verifyUserAccount(adminActor: User, targetUserId: string): { success: boolean; error?: string } {
    if (adminActor.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const target = db.getUserById(targetUserId);
    if (!target) {
      return { success: false, error: 'Account not found.' };
    }

    target.accountStatus = 'ACTIVE';
    target.emailVerified = true;
    db.saveUser(target);

    db.recordAudit(adminActor, 'VERIFY_ACCOUNT', 'USER', target.id, `Verified account for ${target.email}`);
    db.createNotification({
      recipientUserId: target.id,
      type: 'ACCOUNT_VERIFIED',
      title: 'Account Verified by Administrator',
      message: 'Your BRAIN HUB researcher account has been verified! You can now publish research papers directly to the public repository.',
      isRead: false,
    });

    return { success: true };
  },

  suspendUserAccount(adminActor: User, targetUserId: string): { success: boolean; error?: string } {
    if (adminActor.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const target = db.getUserById(targetUserId);
    if (!target) return { success: false, error: 'Account not found.' };
    if (target.role === 'ADMIN') return { success: false, error: 'Cannot suspend an administrator account.' };

    target.accountStatus = 'SUSPENDED';
    db.saveUser(target);

    db.recordAudit(adminActor, 'SUSPEND_ACCOUNT', 'USER', target.id, `Suspended account ${target.email}`);
    db.createNotification({
      recipientUserId: target.id,
      type: 'ACCOUNT_SUSPENDED',
      title: 'Account Suspended',
      message: 'Your account access has been suspended by the system administrator.',
      isRead: false,
    });

    return { success: true };
  },

  deleteUserAccount(adminActor: User, targetUserId: string): { success: boolean; error?: string } {
    if (adminActor.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const target = db.getUserById(targetUserId);
    if (!target) return { success: false, error: 'Account not found.' };
    if (target.role === 'ADMIN') return { success: false, error: 'Cannot delete primary administrator account.' };

    db.deleteUser(target.id);
    db.recordAudit(adminActor, 'DELETE_ACCOUNT', 'USER', target.id, `Deleted account ${target.email}`);
    return { success: true };
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
      createdAt: new Date().toISOString(),
    };

    db.saveUser(newAdmin);
    const sanitized = sanitizeUser(newAdmin);
    db.recordAudit(adminActor, 'PROVISION_ADMIN', 'USER', sanitized.id, `New administrator account created for ${sanitized.email}`);

    return { success: true, user: sanitized };
  },

  updateAdminPassword(adminActor: User, currentPass: string, newPass: string): { success: boolean; error?: string } {
    const user = db.getUserById(adminActor.id);
    if (!user || user.role !== 'ADMIN') return { success: false, error: 'Administrator not found.' };

    if (!verifyPassword(currentPass, user.passwordHash)) {
      return { success: false, error: 'Current password does not match.' };
    }
    if (newPass.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    user.passwordHash = hashPassword(newPass);
    db.saveUser(user);
    db.recordAudit(sanitizeUser(user), 'ADMIN_PASSWORD_RESET', 'ADMIN', user.id, 'Administrator password updated');
    return { success: true };
  },
};

function sanitizeUser(stored: StoredUser): User {
  const { passwordHash, ...safe } = stored;
  return safe;
}
