/**
 * Main Tournament Application Component
 * Handles routing between dashboard, creation, and tournament views
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TournamentListItem } from '../lib/storage/localStorage';
import { listTournaments, deleteTournament } from '../lib/storage/localStorage';
import TournamentDashboard from './tournament/TournamentDashboard';
import TournamentCreate from './tournament/TournamentCreate';
import TournamentView from './tournament/TournamentView';
import '../lib/i18n/config'; // Initialize i18n

type View =
  | { type: 'dashboard' }
  | { type: 'create' }
  | { type: 'tournament'; id: string };

export default function TournamentApp() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);

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
    if (confirm(t('dashboard.deleteConfirm'))) {
      deleteTournament(id);
      refreshTournaments();
    }
  };

  const handleBackToDashboard = () => {
    refreshTournaments();
    setView({ type: 'dashboard' });
  };

  const handleCancelCreate = () => {
    setView({ type: 'dashboard' });
  };

  // Render based on current view
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
    <TournamentDashboard
      tournaments={tournaments}
      onCreateNew={handleCreateNew}
      onViewTournament={handleViewTournament}
      onDeleteTournament={handleDeleteTournament}
      onRefresh={refreshTournaments}
    />
  );
}
