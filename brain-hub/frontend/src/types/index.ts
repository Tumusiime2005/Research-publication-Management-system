export type Role = 'RESEARCHER' | 'ADMIN';

export type PublicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  institution: string;
  department?: string;
  profilePhotoUrl?: string;
  emailVerified: boolean;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt?: string;
}

export interface StoredUser extends User {
  passwordHash: string;
}

export interface PublicationAuthor {
  id: string;
  publicationId: string;
  authorName: string;
  authorEmail: string;
  authorOrder: number;
  isRegisteredUser: boolean;
}

export interface PublicationReview {
  id: string;
  publicationId: string;
  reviewerId: string;
  reviewerName: string;
  decision: ReviewDecision;
  verificationNotes: string;
  createdAt: string;
}

export interface Publication {
  id: string;
  title: string;
  abstractText: string;
  researchArea: string;
  keywords: string;
  documentUrl?: string;
  documentOriginalName?: string;
  documentSize?: number;
  documentMimeType?: string;
  documentData?: string; // Base64 data for local preview & download
  status: PublicationStatus;
  submittedBy: User;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  authors: PublicationAuthor[];
  reviews: PublicationReview[];
}

export interface Notification {
  id: string;
  recipientUserId: string;
  type: string;
  title: string;
  message: string;
  relatedPublicationId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInMs: number;
  user: User;
}

export interface DashboardStats {
  totalPublications: number;
  drafts: number;
  submitted: number;
  underReview: number;
  approved: number;
  rejected: number;
  unreadNotifications: number;
}

export interface AdminDashboardStats {
  totalResearchers: number;
  totalPublications: number;
  pendingReviews: number;
  approvedPublications: number;
  rejectedPublications: number;
  unreadNotifications: number;
}
