/**
 * Main Tournament Application Component
 * Handles routing between dashboard, creation, and tournament views
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TournamentListItem } from '../lib/storage/localStorage';
import { listTournaments, deleteTournament } from '../lib/storage/localStorage';
import LandingPage from './LandingPage';
import TournamentDashboard from './tournament/TournamentDashboard';
import TournamentCreate from './tournament/TournamentCreate';
import TournamentView from './tournament/TournamentView';
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

  // Load tournaments from localStorage
  const refreshTournaments = () => {
    const tournamentList = listTournaments();
    setTournaments(tournamentList);
  };

  useEffect(() => {
    refreshTournaments();
  }, []);

  const handleCreateNew = () => {
    setView({ type: 'create' });
  };

  const handleTournamentCreated = (id: string) => {
    refreshTournaments();
    setView({ type: 'tournament', id });
  };

  const handleViewTournament = (id: string) => {
    setView({ type: 'tournament', id });
  };

  const handleDeleteTournament = (id: string) => {
    setTournamentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tournamentToDelete) {
      deleteTournament(tournamentToDelete);
      refreshTournaments();
    }
    setDeleteDialogOpen(false);
    setTournamentToDelete(null);
  };

  const handleBackToDashboard = () => {
    refreshTournaments();
    setView({ type: 'dashboard' });
  };

  const handleCancelCreate = () => {
    setView({ type: 'dashboard' });
  };

  const handleEnterApp = () => {
    refreshTournaments();
    setView({ type: 'dashboard' });
  };

  // Render based on current view
  if (view.type === 'landing') {
    return <LandingPage onEnter={handleEnterApp} />;
  }

  if (view.type === 'create') {
    return (
      <TournamentCreate
        onTournamentCreated={handleTournamentCreated}
        onCancel={handleCancelCreate}
      />
    );
  }

  if (view.type === 'tournament') {
    return (
      <TournamentView
        tournamentId={view.id}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Dashboard view
  return (
    <>
      <TournamentDashboard
        tournaments={tournaments}
        onCreateNew={handleCreateNew}
        onViewTournament={handleViewTournament}
        onDeleteTournament={handleDeleteTournament}
        onRefresh={refreshTournaments}
      />

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
