/**
 * Tournament Dashboard
 * Displays list of all tournaments with options to create, view, delete, import/export
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TournamentListItem } from '../../lib/storage/localStorage';
import {
  importTournamentFromFile,
  downloadTournamentExport,
  getStorageInfo,
} from '../../lib/storage/localStorage';
import LanguageSwitcher from '../LanguageSwitcher';
import { Button } from '@/components/ui/button';

interface Props {
  tournaments: TournamentListItem[];
  onCreateNew: () => void;
  onViewTournament: (id: string) => void;
  onDeleteTournament: (id: string) => void;
  onRefresh: () => void;
}

export default function TournamentDashboard({
  tournaments,
  onCreateNew,
  onViewTournament,
  onDeleteTournament,
  onRefresh,
}: Props) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const importedId = await importTournamentFromFile(file);

    if (importedId) {
      alert(t('dashboard.importSuccess'));
      onRefresh();
    } else {
      alert(t('dashboard.importError'));
    }

    setImporting(false);
    // Reset input
    event.target.value = '';
  };

  const handleExport = (id: string) => {
    try {
      downloadTournamentExport(id);
    } catch (error) {
      alert(t('dashboard.exportError'));
      console.error(error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (tournament: TournamentListItem) => {
    if (tournament.completed) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          {t('status.completed')}
        </span>
      );
    } else if (tournament.started) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          {t('status.inProgress')}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          {t('status.notStarted')}
        </span>
      );
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'single-elimination': t('tournamentTypes.singleElimination'),
      'double-elimination': t('tournamentTypes.doubleElimination'),
      'round-robin': t('tournamentTypes.roundRobin'),
      'swiss': t('tournamentTypes.swiss'),
      'free-for-all': t('tournamentTypes.freeForAll'),
    };
    return labels[type] || type;
  };

  const storageInfo = getStorageInfo();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {t(`dashboard.tournamentCount_${tournaments.length === 1 ? 'one' : 'other'}`, { count: tournaments.length })} • {storageInfo.estimatedSize}
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-2 items-center">
            <LanguageSwitcher />

            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                {importing ? t('common.importing') : t('common.import')}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </Button>

            <Button onClick={onCreateNew}>
              {t('dashboard.newTournament')}
            </Button>
          </div>
        </div>

        {/* Tournaments List */}
        {tournaments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('dashboard.noTournaments')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.noTournamentsDescription')}</p>
            <div className="mt-6">
              <Button onClick={onCreateNew}>
                {t('dashboard.newTournament')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <ul className="divide-y divide-gray-200">
              {tournaments.map((tournament) => (
                <li
                  key={tournament.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => onViewTournament(tournament.id)}
                          className="text-left w-full focus:outline-none"
                        >
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {tournament.name}
                            </h3>
                            {getStatusBadge(tournament)}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 gap-4">
                            <span className="font-medium text-gray-700">
                              {getTypeLabel(tournament.type)}
                            </span>
                            <span>•</span>
                            <span>{t('dashboard.created')} {formatDate(tournament.createdAt)}</span>
                            {tournament.updatedAt !== tournament.createdAt && (
                              <>
                                <span>•</span>
                                <span>{t('dashboard.updated')} {formatDate(tournament.updatedAt)}</span>
                              </>
                            )}
                          </div>
                        </button>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(tournament.id)}
                          title="Export"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteTournament(tournament.id)}
                          title="Delete"
                          className="text-red-700 hover:bg-red-50 hover:text-red-700"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
