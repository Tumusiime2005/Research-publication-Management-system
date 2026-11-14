import React, { useState, useEffect, useRef } from 'react';
import { User, Publication } from './types';
import { authService, subscribeToAuth } from './services/auth';
import { db, subscribeToDb } from './services/db';
import { initFirestoreSync } from './services/firestoreSync';
import { triggerDeviceNotification } from './services/deviceNotifications';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { PublicCatalog } from './components/public/PublicCatalog';
import { PublicationDetailModal } from './components/public/PublicationDetailModal';
import { ResearcherDashboard } from './components/researcher/ResearcherDashboard';
import { PublicationFormModal } from './components/researcher/PublicationFormModal';
import { AuthModal } from './components/auth/AuthModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [publications, setPublications] = useState<Publication[]>(db.getPublications());
  const [currentView, setCurrentView] = useState<'public' | 'researcher'>('public');

  // Track notified IDs so incoming Firestore alerts trigger device notifications once
  const seenNotifIdsRef = useRef<Set<string>>(new Set());

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);

  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  useEffect(() => {
    // Seed initial notifications seen set
    if (currentUser) {
      db.getNotifications(currentUser.id).forEach(n => seenNotifIdsRef.current.add(n.id));
    }

    const unsubAuth = subscribeToAuth((u) => {
      setCurrentUser(u);
      if (!u && currentView === 'researcher') {
        setCurrentView('public');
      }
    });

    const unsubDb = subscribeToDb(() => {
      setPublications(db.getPublications());
    });

    // Real-time Cloud Sync via Firestore (linked directly with the separate Admin Dashboard)
    const unsubFirestore = initFirestoreSync(
      (cloudPubs, authoritative) => {
        db.setExternalPublications(cloudPubs, authoritative);
        setPublications(db.getPublications());
      },
      (cloudUsers, authoritative) => {
        db.setExternalUsers(cloudUsers, authoritative);
        authService.syncActiveSessionsWithDb();
      },
      (cloudNotifs, authoritative) => {
        db.setExternalNotifications(cloudNotifs, authoritative);
        const activeUser = authService.getCurrentUser();
        if (activeUser) {
          cloudNotifs
            .filter(n => n.recipientUserId === activeUser.id && !n.isRead)
            .forEach(n => {
              if (!seenNotifIdsRef.current.has(n.id)) {
                seenNotifIdsRef.current.add(n.id);
                triggerDeviceNotification(n.title, n.message);
              }
            });
        }
      }
    );

    return () => {
      unsubAuth();
      unsubDb();
      unsubFirestore();
    };
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
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

  const handlePublishDraft = (pub: Publication) => {
    if (!currentUser || currentUser.accountStatus !== 'ACTIVE') return;
    const now = new Date().toISOString();
    const updated: Publication = {
      ...pub,
      status: 'APPROVED',
      publishedAt: pub.publishedAt || now,
      updatedAt: now,
    };
    db.savePublication(updated);
    db.recordAudit(
      currentUser,
      'PUBLISH_PUBLICATION',
      'PUBLICATION',
      pub.id,
      `Published under domain "${pub.researchArea}": ${pub.title}`
    );

    const admins = db.getUsers().filter(u => u.role === 'ADMIN');
    admins.forEach(admin => {
      db.createNotification({
        recipientUserId: admin.id,
        type: 'NEW_PUBLICATION',
        title: 'New Research Paper Published',
        message: `${currentUser.firstName} ${currentUser.lastName} published "${pub.title}" under category "${pub.researchArea}".`,
        relatedPublicationId: pub.id,
        isRead: false,
      });
    });

    db.createNotification({
      recipientUserId: currentUser.id,
      type: 'PUBLICATION_LIVE',
      title: 'Paper Published to Repository',
      message: `Your paper "${pub.title}" is now live under the "${pub.researchArea}" category.`,
      relatedPublicationId: pub.id,
      isRead: false,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E1B4B]">
      {/* User Portal Top Navigation */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'researcher' && !currentUser) {
            handleOpenAuth('login');
            return;
          }
          setCurrentView(view);
        }}
        onOpenAuth={handleOpenAuth}
        onOpenNewPublication={handleOpenNewPublication}
        onOpenNotifications={() => setNotificationDrawerOpen(true)}
      />

      {/* Main User View Router */}
      <main className="flex-1">
        {currentView === 'public' && (
          <PublicCatalog
            publications={publications}
            onSelectPublication={handleViewPublication}
          />
        )}

        {currentView === 'researcher' && currentUser && (
          <ResearcherDashboard
            currentUser={currentUser}
            publications={publications}
            onOpenCreate={handleOpenNewPublication}
            onEditPublication={handleEditPublication}
            onViewPublication={handleViewPublication}
            onPublishDraft={handlePublishDraft}
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
          if (u) setCurrentView('researcher');
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

      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        currentUser={currentUser}
        onClose={() => setNotificationDrawerOpen(false)}
        onSelectPublication={handleSelectById}
      />

      <OfflineIndicator />
    </div>
  );
}
