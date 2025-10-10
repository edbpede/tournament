/**
 * LocalStorage Service for Tournament Persistence
 * Handles saving, loading, and managing tournaments in browser localStorage
 */

import type { TournamentState, TournamentExport } from '../tournaments/types';

const STORAGE_KEY = 'tournaments';
const EXPORT_VERSION = '1.0.0';

/**
 * Check if we're in a browser environment (not SSR)
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export interface TournamentListItem {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  started: boolean;
  completed: boolean;
}

/**
 * Get all tournament IDs and metadata from localStorage
 */
export function listTournaments(): TournamentListItem[] {
  if (!isBrowser()) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const tournaments = JSON.parse(stored) as Record<string, TournamentState>;

    return Object.values(tournaments).map((state) => ({
      id: state.id,
      name: state.name,
      type: state.type,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      started: state.started,
      completed: state.completed,
    }));
  } catch (error) {
    console.error('Error listing tournaments:', error);
    return [];
  }
}

/**
 * Save a tournament state to localStorage
 */
export function saveTournamentState(state: TournamentState): void {
  if (!isBrowser()) {
    console.warn('Cannot save tournament: localStorage not available (SSR)');
    return;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const tournaments = stored ? JSON.parse(stored) : {};

    tournaments[state.id] = state;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('Error saving tournament:', error);
    throw new Error('Failed to save tournament to localStorage');
  }
}

/**
 * Load a tournament state from localStorage
 */
export function loadTournamentState(id: string): TournamentState | null {
  if (!isBrowser()) return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const tournaments = JSON.parse(stored) as Record<string, TournamentState>;
    return tournaments[id] || null;
  } catch (error) {
    console.error('Error loading tournament:', error);
    return null;
  }
}

/**
 * Delete a tournament from localStorage
 */
export function deleteTournament(id: string): boolean {
  if (!isBrowser()) return false;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const tournaments = JSON.parse(stored) as Record<string, TournamentState>;

    if (!tournaments[id]) return false;

    delete tournaments[id];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    return true;
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return false;
  }
}

/**
 * Export a tournament to JSON string
 */
export function exportTournament(id: string): string {
  const state = loadTournamentState(id);
  if (!state) {
    throw new Error(`Tournament with id ${id} not found`);
  }

  const exportData: TournamentExport = {
    exportVersion: EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    state,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export a tournament and trigger download
 */
export function downloadTournamentExport(id: string): void {
  const json = exportTournament(id);
  const state = loadTournamentState(id);

  if (!state) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Create a safe filename
  const safeFileName = state.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.href = url;
  link.download = `tournament_${safeFileName}_${state.id.slice(0, 8)}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Import a tournament from JSON string
 * Returns the tournament ID if successful, null otherwise
 */
export function importTournament(json: string): string | null {
  try {
    const data = JSON.parse(json) as TournamentExport;

    // Validate export format
    if (!data.state || !data.state.id || !data.state.type) {
      throw new Error('Invalid tournament export format');
    }

    // Check if tournament with this ID already exists
    const existing = loadTournamentState(data.state.id);
    if (existing) {
      // Generate new ID to avoid conflicts
      data.state.id = generateId();
      data.state.name = `${data.state.name} (Imported)`;
    }

    // Save the imported tournament
    saveTournamentState(data.state);

    return data.state.id;
  } catch (error) {
    console.error('Error importing tournament:', error);
    return null;
  }
}

/**
 * Import tournament from file input
 */
export function importTournamentFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const id = importTournament(json);
        resolve(id);
      } catch (error) {
        console.error('Error reading file:', error);
        resolve(null);
      }
    };

    reader.onerror = () => {
      console.error('Error reading file');
      resolve(null);
    };

    reader.readAsText(file);
  });
}

/**
 * Clear all tournaments from localStorage (use with caution!)
 */
export function clearAllTournaments(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Generate a unique ID (same implementation as BaseTournament)
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): {
  tournamentCount: number;
  estimatedSize: string;
} {
  if (!isBrowser()) {
    return {
      tournamentCount: 0,
      estimatedSize: '0.00 KB',
    };
  }

  const tournaments = listTournaments();
  const stored = localStorage.getItem(STORAGE_KEY);
  const bytes = stored ? new Blob([stored]).size : 0;

  return {
    tournamentCount: tournaments.length,
    estimatedSize: `${(bytes / 1024).toFixed(2)} KB`,
  };
}
