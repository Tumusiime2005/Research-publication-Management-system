import { User, StoredUser, Publication, Notification, AuditLog } from '../types';
import {
  savePublicationToFirestore,
  deletePublicationFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveNotificationToFirestore,
  INITIAL_MAIN_ADMIN,
  PRIMARY_ADMIN_EMAIL,
} from './firestoreSync';
import { hashPassword, verifyPassword, generateUUID, normalizeDomainName } from './utils';

export { hashPassword, verifyPassword, generateUUID, normalizeDomainName };

const STORAGE_KEY_PREFIX = 'brain_hub_v2_';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function subscribeToDb(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Low-level storage helpers
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    notifyListeners();
  } catch (err) {
    console.error('Storage quota exceeded or error saving to localStorage', err);
  }
}

// Ensure all local accounts & admin password are reset on v4 upgrade
function ensureInitializedAccounts(): void {
  const resetFlag = 'brain_hub_reset_accounts_maron_v4';
  if (typeof window !== 'undefined' && localStorage.getItem(resetFlag) !== 'done') {
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'users');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'notifications');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'audit_logs');
    localStorage.removeItem('brain_hub_v1_users');
    localStorage.removeItem('brain_hub_session_user');
    localStorage.removeItem('brain_hub_admin_session');

    const initialUsers: StoredUser[] = [INITIAL_MAIN_ADMIN];
    localStorage.setItem(STORAGE_KEY_PREFIX + 'users', JSON.stringify(initialUsers));
    localStorage.setItem(resetFlag, 'done');
  }
}
ensureInitializedAccounts();

export const db = {
  // --- USERS ---
  getUsers(): StoredUser[] {
    const users = getStored<StoredUser[]>('users', []).map((u) =>
      u.role === 'RESEARCHER' && u.accountStatus === 'PENDING'
        ? { ...u, accountStatus: 'ACTIVE' as const, emailVerified: true }
        : u
    );
    if (!users.some(u => u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase())) {
      users.unshift(INITIAL_MAIN_ADMIN);
      setStored('users', users);
    }
    return users;
  },

  getUserByEmail(email: string): StoredUser | undefined {
    const normalized = email.toLowerCase().trim();
    return this.getUsers().find(u => u.email.toLowerCase() === normalized);
  },

  getUserById(id: string): StoredUser | undefined {
    return this.getUsers().find(u => u.id === id);
  },

  saveUser(user: StoredUser): StoredUser {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    setStored('users', users);
    saveUserToFirestore(user);
    return user;
  },

  deleteUser(id: string): boolean {
    if (id === INITIAL_MAIN_ADMIN.id) return false;
    const users = this.getUsers().filter(u => u.id !== id);
    setStored('users', users);
    deleteUserFromFirestore(id);
    return true;
  },

  setExternalUsers(cloudUsers: StoredUser[], authoritative = false): void {
    const map = new Map<string, StoredUser>();
    if (!authoritative) {
      this.getUsers().forEach(u => map.set(u.id, u));
    }
    cloudUsers.forEach((u) => {
      const normalized =
        u.role === 'RESEARCHER' && u.accountStatus === 'PENDING'
          ? { ...u, accountStatus: 'ACTIVE' as const, emailVerified: true }
          : u;
      map.set(normalized.id, normalized);
    });
    if (!map.has(INITIAL_MAIN_ADMIN.id)) {
      map.set(INITIAL_MAIN_ADMIN.id, INITIAL_MAIN_ADMIN);
    }
    setStored('users', Array.from(map.values()));
  },

  // --- PUBLICATIONS ---
  getPublications(): Publication[] {
    return getStored<Publication[]>('publications', []);
  },

  getPublicationById(id: string): Publication | undefined {
    return this.getPublications().find(p => p.id === id);
  },

  savePublication(pub: Publication): Publication {
    const publications = this.getPublications();
    const index = publications.findIndex(p => p.id === pub.id);
    pub.updatedAt = new Date().toISOString();
    if (index >= 0) {
      publications[index] = pub;
    } else {
      publications.unshift(pub);
    }
    setStored('publications', publications);
    savePublicationToFirestore(pub);
    return pub;
  },

  setExternalPublications(cloudPubs: Publication[], authoritative = false): void {
    const map = new Map<string, Publication>();
    if (!authoritative) {
      this.getPublications().forEach(p => map.set(p.id, p));
    }
    cloudPubs.forEach(p => map.set(p.id, p));
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setStored('publications', merged);
  },

  deletePublication(id: string): boolean {
    const publications = this.getPublications().filter(p => p.id !== id);
    setStored('publications', publications);
    deletePublicationFromFirestore(id);
    return true;
  },

  // --- NOTIFICATIONS ---
  getNotifications(userId: string): Notification[] {
    return getStored<Notification[]>('notifications', [])
      .filter(n => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createNotification(notif: Omit<Notification, 'id' | 'createdAt'>): Notification {
    const notifications = getStored<Notification[]>('notifications', []);
    const newNotif: Notification = {
      ...notif,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(newNotif);
    setStored('notifications', notifications);
    saveNotificationToFirestore(newNotif);
    return newNotif;
  },

  markNotificationRead(id: string): void {
    const notifications = getStored<Notification[]>('notifications', []);
    const item = notifications.find(n => n.id === id);
    if (item) {
      item.isRead = true;
      setStored('notifications', notifications);
      saveNotificationToFirestore(item);
    }
  },

  markAllNotificationsRead(userId: string): void {
    const notifications = getStored<Notification[]>('notifications', []);
    notifications.forEach(n => {
      if (n.recipientUserId === userId && !n.isRead) {
        n.isRead = true;
        saveNotificationToFirestore(n);
      }
    });
    setStored('notifications', notifications);
  },

  setExternalNotifications(cloudNotifs: Notification[], authoritative = false): void {
    const map = new Map<string, Notification>();
    if (!authoritative) {
      getStored<Notification[]>('notifications', []).forEach(n => map.set(n.id, n));
    }
    cloudNotifs.forEach(n => map.set(n.id, n));
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setStored('notifications', merged);
  },

  // --- AUDIT LOGS ---
  getAuditLogs(): AuditLog[] {
    return getStored<AuditLog[]>('audit_logs', []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  recordAudit(actor: User | null, action: string, entityType: string, entityId?: string, metadata?: string): void {
    const logs = getStored<AuditLog[]>('audit_logs', []);
    const newLog: AuditLog = {
      id: generateUUID(),
      actorUserId: actor ? actor.id : undefined,
      actorEmail: actor ? actor.email : 'SYSTEM',
      action,
      entityType,
      entityId,
      metadata,
      ipAddress: 'Cloud Sync',
      createdAt: new Date().toISOString(),
    };
    logs.unshift(newLog);
    setStored('audit_logs', logs.slice(0, 150));
  },
};
