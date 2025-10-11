/**
 * Main Tournament Application Component
 * Handles routing between dashboard, creation, and tournament views
 */

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { TournamentListItem } from '../lib/storage/localStorage';
import { listTournaments, deleteTournament } from '../lib/storage/localStorage';
import LandingPage from './LandingPage';
import '../lib/i18n/config'; // Initialize i18n
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Lazy-load heavy views to reduce initial bundle size
const TournamentDashboard = lazy(() => import('./tournament/TournamentDashboard'));
const TournamentCreate = lazy(() => import('./tournament/TournamentCreate'));
const TournamentView = lazy(() => import('./tournament/TournamentView'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

type View =
  | { type: 'landing' }
  | { type: 'dashboard' }
  | { type: 'create' }
  | { type: 'tournament'; id: string };

export default function TournamentApp() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>({ type: 'landing' });
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);

  // Load tournaments from localStorage - memoized to prevent re-parsing on every render
  const refreshTournaments = useCallback(() => {
    const tournamentList = listTournaments();
    setTournaments(tournamentList);
  }, []);

  useEffect(() => {
    refreshTournaments();
  }, [refreshTournaments]);

  // Memoize handlers to prevent unnecessary re-renders of child components
  const handleCreateNew = useCallback(() => {
    setView({ type: 'create' });
  }, []);

  const handleTournamentCreated = useCallback((id: string) => {
    refreshTournaments();
    setView({ type: 'tournament', id });
  }, [refreshTournaments]);

  const handleViewTournament = useCallback((id: string) => {
    setView({ type: 'tournament', id });
  }, []);

  const handleDeleteTournament = useCallback((id: string) => {
    setTournamentToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (tournamentToDelete) {
      deleteTournament(tournamentToDelete);
      refreshTournaments();
    }
    setDeleteDialogOpen(false);
    setTournamentToDelete(null);
  }, [tournamentToDelete, refreshTournaments]);

  const handleBackToDashboard = useCallback(() => {
    refreshTournaments();
    setView({ type: 'dashboard' });
  }, [refreshTournaments]);

  const handleCancelCreate = useCallback(() => {
    setView({ type: 'dashboard' });
  }, []);

  const handleEnterApp = useCallback(() => {
    refreshTournaments();
    setView({ type: 'dashboard' });
  }, [refreshTournaments]);

  // Render based on current view
  if (view.type === 'landing') {
    return <LandingPage onEnter={handleEnterApp} />;
  }

  if (view.type === 'create') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <TournamentCreate
          onTournamentCreated={handleTournamentCreated}
          onCancel={handleCancelCreate}
        />
      </Suspense>
    );
  }

  if (view.type === 'tournament') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <TournamentView
          tournamentId={view.id}
          onBack={handleBackToDashboard}
        />
      </Suspense>
    );
  }

  // Dashboard view
  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <TournamentDashboard
          tournaments={tournaments}
          onCreateNew={handleCreateNew}
          onViewTournament={handleViewTournament}
          onDeleteTournament={handleDeleteTournament}
          onRefresh={refreshTournaments}
        />
      </Suspense>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.deleteConfirmDescription') || 'This action cannot be undone. This will permanently delete the tournament and all its data.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
