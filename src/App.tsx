import React, { useState, useEffect } from 'react';
import { User, Publication } from './types';
import { authService, subscribeToAuth } from './services/auth';
import { db, subscribeToDb } from './services/db';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { PublicCatalog } from './components/public/PublicCatalog';
import { PublicationDetailModal } from './components/public/PublicationDetailModal';
import { ResearcherDashboard } from './components/researcher/ResearcherDashboard';
import { PublicationFormModal } from './components/researcher/PublicationFormModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ReviewModal } from './components/admin/ReviewModal';
import { AuditLogViewerModal } from './components/admin/AuditLogViewerModal';
import { AuthModal } from './components/auth/AuthModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [publications, setPublications] = useState<Publication[]>(db.getPublications());
  const [currentView, setCurrentView] = useState<'public' | 'researcher' | 'admin'>('public');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register' | 'bootstrap'>('login');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingPublication, setReviewingPublication] = useState<Publication | null>(null);

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  useEffect(() => {
    const unsubAuth = subscribeToAuth((u) => {
      setCurrentUser(u);
    });

    const unsubDb = subscribeToDb(() => {
      setPublications(db.getPublications());
    });

    return () => {
      unsubAuth();
      unsubDb();
    };
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' | 'bootstrap' = 'login') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenNewPublication = () => {
    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    setEditingPublication(null);
    setFormModalOpen(true);
  };

  const handleEditPublication = (pub: Publication) => {
    setEditingPublication(pub);
    setFormModalOpen(true);
  };

  const handleViewPublication = (pub: Publication) => {
    setSelectedPublication(pub);
    setDetailModalOpen(true);
  };

  const handleSelectById = (id: string) => {
    const pub = db.getPublicationById(id);
    if (pub) {
      setSelectedPublication(pub);
      setDetailModalOpen(true);
    }
  };

  const handleReviewPublication = (pub: Publication) => {
    setReviewingPublication(pub);
    setReviewModalOpen(true);
  };

  const handleSubmitDraft = (pub: Publication) => {
    if (!currentUser) return;
    const updated: Publication = {
      ...pub,
      status: 'SUBMITTED',
      updatedAt: new Date().toISOString(),
    };
    db.savePublication(updated);
    db.recordAudit(
      currentUser,
      'SUBMIT_PUBLICATION',
      'PUBLICATION',
      pub.id,
      `Submitted: ${pub.title}`
    );

    // Notify admins
    const admins = db.getUsers().filter(u => u.role === 'ADMIN');
    admins.forEach(admin => {
      db.createNotification({
        recipientUserId: admin.id,
        type: 'NEW_SUBMISSION',
        title: 'New Research Paper Submitted',
        message: `Researcher ${currentUser.firstName} ${currentUser.lastName} submitted "${pub.title}" for review.`,
        relatedPublicationId: pub.id,
        isRead: false,
      });
    });
  };

  const handleSeedCorpus = () => {
    // If no user exists, create researcher and admin first
    let researcher = currentUser;
    if (!researcher || researcher.role !== 'RESEARCHER') {
      const regRes = authService.registerResearcher({
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@oxford.ac.uk',
        password: 'Password2026!',
        institution: 'University of Oxford',
        department: 'Computational Neuroscience',
      });
      if (regRes.user) researcher = regRes.user;
    }

    let admin = db.getUsers().find(u => u.role === 'ADMIN');
    if (!admin) {
      const bRes = authService.bootstrapAdmin({
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'editor.in.chief@brainhub.academic',
        password: 'AdminPassword2026!',
        institution: 'Global Academic Review Board',
        bootstrapToken: 'BH-BOOTSTRAP-SECURE-KEY-2026',
      });
      if (bRes.user) admin = bRes.user as any;
    }

    if (researcher && admin) {
      db.seedAcademicCorpus(researcher, admin as any);
      setPublications(db.getPublications());
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E1B4B]">
      {/* Top Bar Contract Navigation */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'researcher' && (!currentUser || currentUser.role !== 'RESEARCHER')) {
            handleOpenAuth('login');
            return;
          }
          if (view === 'admin' && (!currentUser || currentUser.role !== 'ADMIN')) {
            handleOpenAuth('bootstrap');
            return;
          }
          setCurrentView(view);
        }}
        onOpenAuth={handleOpenAuth}
        onOpenNewPublication={handleOpenNewPublication}
        onOpenNotifications={() => setNotificationDrawerOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'public' && (
          <PublicCatalog
            publications={publications}
            onSelectPublication={handleViewPublication}
            onOpenSeedCorpus={handleSeedCorpus}
          />
        )}

        {currentView === 'researcher' && currentUser && (
          <ResearcherDashboard
            currentUser={currentUser}
            publications={publications}
            onOpenCreate={handleOpenNewPublication}
            onEditPublication={handleEditPublication}
            onViewPublication={handleViewPublication}
            onSubmitPublication={handleSubmitDraft}
          />
        )}

        {currentView === 'admin' && currentUser && currentUser.role === 'ADMIN' && (
          <AdminDashboard
            currentUser={currentUser}
            publications={publications}
            onReviewPublication={handleReviewPublication}
            onViewAuditLogs={() => setAuditModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authInitialMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          const u = authService.getCurrentUser();
          if (u?.role === 'RESEARCHER') setCurrentView('researcher');
          if (u?.role === 'ADMIN') setCurrentView('admin');
        }}
      />

      {currentUser && (
        <PublicationFormModal
          isOpen={formModalOpen}
          currentUser={currentUser}
          editPublication={editingPublication}
          onClose={() => {
            setFormModalOpen(false);
            setEditingPublication(null);
          }}
          onSuccess={() => {
            setPublications(db.getPublications());
          }}
        />
      )}

      <PublicationDetailModal
        publication={selectedPublication}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedPublication(null);
        }}
      />

      {currentUser && currentUser.role === 'ADMIN' && (
        <ReviewModal
          publication={reviewingPublication}
          currentUser={currentUser}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewingPublication(null);
          }}
          onSuccess={() => {
            setPublications(db.getPublications());
          }}
        />
      )}

      <AuditLogViewerModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />

      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        currentUser={currentUser}
        onClose={() => setNotificationDrawerOpen(false)}
        onSelectPublication={handleSelectById}
      />
    </div>
  );
}
