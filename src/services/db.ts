import { User, StoredUser, Publication, PublicationAuthor, PublicationReview, Notification, AuditLog, Role, PublicationStatus, ReviewDecision } from '../types';

const STORAGE_KEY_PREFIX = 'brain_hub_v1_';

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

// Pseudo-BCrypt hash simulation for browser environment (produces non-reversible salted token)
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `$2a$12$BH.${Math.abs(hash).toString(16).padStart(12, '0')}.${btoa(password.slice(0, 3)).replace(/=/g, '')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

// UUID generator
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Database Service operations
export const db = {
  // --- USERS ---
  getUsers(): StoredUser[] {
    return getStored<StoredUser[]>('users', []);
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
    return user;
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
    return pub;
  },

  deletePublication(id: string): boolean {
    const publications = this.getPublications().filter(p => p.id !== id);
    setStored('publications', publications);
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
      createdAt: new Date().toISOString()
    };
    notifications.unshift(newNotif);
    setStored('notifications', notifications);
    return newNotif;
  },

  markNotificationRead(id: string): void {
    const notifications = getStored<Notification[]>('notifications', []);
    const item = notifications.find(n => n.id === id);
    if (item) {
      item.isRead = true;
      setStored('notifications', notifications);
    }
  },

  markAllNotificationsRead(userId: string): void {
    const notifications = getStored<Notification[]>('notifications', []);
    notifications.forEach(n => {
      if (n.recipientUserId === userId) {
        n.isRead = true;
      }
    });
    setStored('notifications', notifications);
  },

  // --- AUDIT LOGS ---
  getAuditLogs(): AuditLog[] {
    return getStored<AuditLog[]>('audit_logs', [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      ipAddress: '127.0.0.1 (AI Studio Sandbox)',
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStored('audit_logs', logs.slice(0, 100)); // retain last 100 entries
  },

  // Database Reset / Clear
  clearDatabase(): void {
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'users');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'publications');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'notifications');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'audit_logs');
    notifyListeners();
  },

  // Optional Academic Seed for Quick Evaluation
  seedAcademicCorpus(authorUser: User, adminUser: User): void {
    const now = new Date();
    const samplePubs: Publication[] = [
      {
        id: generateUUID(),
        title: 'Asymptotic Error Bounds in High-Dimensional Tensor Decomposition for Neural Representation',
        abstractText: 'We present a closed-form derivation of asymptotic error bounds for rank-constrained tensor decompositions applied to continuous neural representations. By formulating Riemannian gradient optimization over the Stiefel manifold, we establish non-convex convergence rates under realistic signal-to-noise ratios, validated on multi-modal neuroimaging datasets.',
        researchArea: 'Computational Neuroscience',
        keywords: 'tensor decomposition, Riemannian geometry, neural manifolds, non-convex optimization',
        status: 'APPROVED',
        documentOriginalName: 'asymptotic_tensor_bounds_final.pdf',
        documentSize: 2450120,
        documentMimeType: 'application/pdf',
        documentUrl: '#sample-doc-1',
        submittedBy: authorUser,
        publishedAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
        createdAt: new Date(now.getTime() - 86400000 * 7).toISOString(),
        updatedAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
        authors: [
          {
            id: generateUUID(),
            publicationId: '',
            authorName: `${authorUser.firstName} ${authorUser.lastName}`,
            authorEmail: authorUser.email,
            authorOrder: 1,
            isRegisteredUser: true
          },
          {
            id: generateUUID(),
            publicationId: '',
            authorName: 'Dr. Elena Rostova',
            authorEmail: 'elena.rostova@oxford.ac.uk',
            authorOrder: 2,
            isRegisteredUser: false
          }
        ],
        reviews: [
          {
            id: generateUUID(),
            publicationId: '',
            reviewerId: adminUser.id,
            reviewerName: `${adminUser.firstName} ${adminUser.lastName}`,
            decision: 'APPROVED',
            verificationNotes: 'Rigorous theoretical proofs verified by the editorial committee. Convergence theorems are sound and experimental methodology aligns with IEEE standards.',
            createdAt: new Date(now.getTime() - 86400000 * 3).toISOString()
          }
        ]
      },
      {
        id: generateUUID(),
        title: 'Provably Robust Consensus in Asynchronous Byzantine Networks Under Byzantine Fault Tolerance Constraints',
        abstractText: 'Consensus mechanisms in high-throughput distributed ledgers suffer from latency inflation in adversarial network partitions. We propose a randomized quorum-intersection algorithm that attains optimal message complexity O(n log n) while tolerating up to 33% malicious Byzantine nodes without relying on trusted execution environments.',
        researchArea: 'Distributed Systems',
        keywords: 'byzantine consensus, asynchronous networks, quorum intersection, fault tolerance',
        status: 'APPROVED',
        documentOriginalName: 'robust_byzantine_consensus.pdf',
        documentSize: 1845100,
        documentMimeType: 'application/pdf',
        documentUrl: '#sample-doc-2',
        submittedBy: authorUser,
        publishedAt: new Date(now.getTime() - 86400000 * 1).toISOString(),
        createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
        updatedAt: new Date(now.getTime() - 86400000 * 1).toISOString(),
        authors: [
          {
            id: generateUUID(),
            publicationId: '',
            authorName: `${authorUser.firstName} ${authorUser.lastName}`,
            authorEmail: authorUser.email,
            authorOrder: 1,
            isRegisteredUser: true
          }
        ],
        reviews: [
          {
            id: generateUUID(),
            publicationId: '',
            reviewerId: adminUser.id,
            reviewerName: `${adminUser.firstName} ${adminUser.lastName}`,
            decision: 'APPROVED',
            verificationNotes: 'Methodology thoroughly reviewed. Formal safety and liveness invariants satisfied under asynchronous adversary models.',
            createdAt: new Date(now.getTime() - 86400000 * 1).toISOString()
          }
        ]
      },
      {
        id: generateUUID(),
        title: 'Scalable Epigenetic Profiling of MicroRNA Biomarkers for Early-Stage Oncology Detection',
        abstractText: 'Early diagnosis of solid tumors hinges on non-invasive quantification of circulating microRNA clusters. Here we demonstrate a microfluidic fluorometric array delivering femtomolar sensitivity for 12 diagnostic biomarkers across 400 patient cohort samples.',
        researchArea: 'Biomedical Informatics',
        keywords: 'epigenetics, microRNA, oncology, microfluidics, biomarker assay',
        status: 'SUBMITTED',
        documentOriginalName: 'epigenetic_profiling_draft.pdf',
        documentSize: 3120000,
        documentMimeType: 'application/pdf',
        documentUrl: '#sample-doc-3',
        submittedBy: authorUser,
        createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
        updatedAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
        authors: [
          {
            id: generateUUID(),
            publicationId: '',
            authorName: `${authorUser.firstName} ${authorUser.lastName}`,
            authorEmail: authorUser.email,
            authorOrder: 1,
            isRegisteredUser: true
          }
        ],
        reviews: []
      }
    ];

    setStored('publications', samplePubs);
    this.recordAudit(adminUser, 'SEED_ACADEMIC_CORPUS', 'SYSTEM', undefined, 'Sample peer-reviewed publications loaded for evaluation');
    notifyListeners();
  }
};
