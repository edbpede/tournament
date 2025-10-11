/**
 * Tournament Creation Wizard
 * Multi-step form to create a new tournament
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TournamentType, TournamentOptions } from '../../lib/tournaments/types';
import { createTournament, getDefaultOptions, validateOptions } from '../../lib/tournaments/factory';
import { saveTournamentState } from '../../lib/storage/localStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  onTournamentCreated: (id: string) => void;
  onCancel: () => void;
}

type Step = 'type' | 'options' | 'participants';

export default function TournamentCreate({ onTournamentCreated, onCancel }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('type');
  const [tournamentType, setTournamentType] = useState<TournamentType | null>(null);
  const [options, setOptions] = useState<Partial<TournamentOptions>>(getDefaultOptions('single-elimination'));
  const [participantInput, setParticipantInput] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleTypeSelect = (type: TournamentType) => {
    setTournamentType(type);
    setOptions(getDefaultOptions(type));
    setStep('options');
  };

  const handleOptionsNext = () => {
    setStep('participants');
  };

  const handleAddParticipant = () => {
    if (!participantInput.trim()) return;

    const currentParticipants = options.participantNames || [];
    const trimmedName = participantInput.trim();

    // Check for duplicate names (case-insensitive)
    if (currentParticipants.some(name => name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors([t('create.duplicateNameError')]);
      return;
    }

    // Clear any previous errors
    setErrors([]);

    setOptions({
      ...options,
      participantNames: [...currentParticipants, trimmedName],
    });
    setParticipantInput('');
  };

  const handleRemoveParticipant = (index: number) => {
    const currentParticipants = options.participantNames || [];
    setOptions({
      ...options,
      participantNames: currentParticipants.filter((_, i) => i !== index),
    });
    // Clear errors when removing a participant
    setErrors([]);
  };

  const handleCreate = () => {
    const validationErrors = validateOptions(options);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const tournament = createTournament(options as TournamentOptions);
      tournament.start();

      const state = tournament.export();
      saveTournamentState(state);

      onTournamentCreated(tournament.getId());
    } catch (error) {
      setErrors([error instanceof Error ? error.message : t('create.createError')]);
    }
  };

  const tournamentTypes: { type: TournamentType; label: string; description: string }[] = [
    {
      type: 'single-elimination',
      label: t('tournamentTypes.singleElimination'),
      description: t('tournamentTypeDescriptions.singleElimination'),
    },
    {
      type: 'double-elimination',
      label: t('tournamentTypes.doubleElimination'),
      description: t('tournamentTypeDescriptions.doubleElimination'),
    },
    {
      type: 'round-robin',
      label: t('tournamentTypes.roundRobin'),
      description: t('tournamentTypeDescriptions.roundRobin'),
    },
    {
      type: 'swiss',
      label: t('tournamentTypes.swiss'),
      description: t('tournamentTypeDescriptions.swiss'),
    },
    {
      type: 'free-for-all',
      label: t('tournamentTypes.freeForAll'),
      description: t('tournamentTypeDescriptions.freeForAll'),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('create.title')}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              title={t('common.cancel')}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[t('create.step.type'), t('create.step.options'), t('create.step.participants')].map((label, index) => {
                const stepKeys: Step[] = ['type', 'options', 'participants'];
                const currentStepIndex = stepKeys.indexOf(step);
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;

                return (
                  <div key={label} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          isCompleted
                            ? 'bg-blue-600 text-white'
                            : isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <span
                        className={`ml-2 text-sm font-medium ${
                          isActive ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {index < 2 && (
                      <div
                        className={`flex-1 h-0.5 mx-4 ${
                          isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800 mb-2">{t('create.errorTitle')}</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Content */}
          {step === 'type' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{t('create.selectType')}</h2>
              <div className="grid grid-cols-1 gap-4">
                {tournamentTypes.map((type) => (
                  <Button
                    key={type.type}
                    variant="outline"
                    onClick={() => handleTypeSelect(type.type)}
                    className="h-auto text-left p-4 justify-start hover:border-blue-500 hover:bg-blue-50"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{type.label}</h3>
                      <p className="text-sm text-gray-600 mt-1 font-normal">{type.description}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 'options' && tournamentType && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">{t('create.tournamentOptions')}</h2>

              {/* Tournament Name */}
              <div>
                <Label htmlFor="tournament-name">
                  {t('create.tournamentName')}
                </Label>
                <Input
                  id="tournament-name"
                  type="text"
                  value={options.name || ''}
                  onChange={(e) => setOptions({ ...options, name: e.target.value })}
                  placeholder={t('create.tournamentNamePlaceholder')}
                  className="mt-2"
                />
              </div>

              {/* Type-specific options */}
              {tournamentType === 'single-elimination' && (
                <>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(options as any).thirdPlaceMatch || false}
                      onChange={(e) =>
                        setOptions({ ...options, thirdPlaceMatch: e.target.checked } as any)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('options.thirdPlaceMatch')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(options as any).tieBreakers || false}
                      onChange={(e) =>
                        setOptions({ ...options, tieBreakers: e.target.checked } as any)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('options.tieBreakers')}</span>
                  </label>
                </>
              )}

              {tournamentType === 'double-elimination' && (
                <>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(options as any).splitStart || false}
                      onChange={(e) =>
                        setOptions({ ...options, splitStart: e.target.checked } as any)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {t('options.splitStart')}
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(options as any).tieBreakers || false}
                      onChange={(e) =>
                        setOptions({ ...options, tieBreakers: e.target.checked } as any)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('options.tieBreakers')}</span>
                  </label>
                </>
              )}

              {tournamentType === 'round-robin' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('options.rankingMethod')}
                    </label>
                    <select
                      value={(options as any).rankingMethod || 'wins'}
                      onChange={(e) =>
                        setOptions({ ...options, rankingMethod: e.target.value as 'wins' | 'points' } as any)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="wins">{t('options.rankingWins')}</option>
                      <option value="points">{t('options.rankingPoints')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('options.numberOfRounds')}
                    </label>
                    <select
                      value={(options as any).rounds || 1}
                      onChange={(e) =>
                        setOptions({ ...options, rounds: parseInt(e.target.value) as 1 | 2 | 3 } as any)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">{t('options.roundsOnce')}</option>
                      <option value="2">{t('options.roundsTwice')}</option>
                      <option value="3">{t('options.roundsThrice')}</option>
                    </select>
                  </div>
                </>
              )}

              {tournamentType === 'swiss' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="points-match-win">
                        {t('options.pointsPerMatchWin')}
                      </Label>
                      <Input
                        id="points-match-win"
                        type="number"
                        min="0"
                        value={(options as any).pointsPerMatchWin || 3}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            pointsPerMatchWin: parseInt(e.target.value),
                          } as any)
                        }
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="points-match-tie">
                        {t('options.pointsPerMatchTie')}
                      </Label>
                      <Input
                        id="points-match-tie"
                        type="number"
                        min="0"
                        value={(options as any).pointsPerMatchTie || 1}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            pointsPerMatchTie: parseInt(e.target.value),
                          } as any)
                        }
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="points-game-win">
                        {t('options.pointsPerGameWin')}
                      </Label>
                      <Input
                        id="points-game-win"
                        type="number"
                        min="0"
                        value={(options as any).pointsPerGameWin || 1}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            pointsPerGameWin: parseInt(e.target.value),
                          } as any)
                        }
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="points-bye">
                        {t('options.pointsPerBye')}
                      </Label>
                      <Input
                        id="points-bye"
                        type="number"
                        min="0"
                        value={(options as any).pointsPerBye || 3}
                        onChange={(e) =>
                          setOptions({ ...options, pointsPerBye: parseInt(e.target.value) } as any)
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                </>
              )}

              {tournamentType === 'free-for-all' && (
                <div>
                  <Label htmlFor="participants-per-match">
                    {t('options.participantsPerMatch')}
                  </Label>
                  <Input
                    id="participants-per-match"
                    type="number"
                    min="2"
                    value={(options as any).participantsPerMatch || 4}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        participantsPerMatch: parseInt(e.target.value),
                      } as any)
                    }
                    className="mt-2"
                  />
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('type')}
                >
                  {t('common.back')}
                </Button>
                <Button
                  onClick={handleOptionsNext}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}

          {step === 'participants' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">{t('create.addParticipants')}</h2>

              <div>
                <Label htmlFor="participant-name">
                  {t('create.participantName')}
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="participant-name"
                    type="text"
                    value={participantInput}
                    onChange={(e) => {
                      setParticipantInput(e.target.value);
                      // Clear errors when user starts typing a new name
                      if (errors.length > 0) {
                        setErrors([]);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddParticipant();
                      }
                    }}
                    placeholder={t('create.participantNamePlaceholder')}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddParticipant}
                  >
                    {t('common.add')}
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {t('create.participantsList', { count: options.participantNames?.length || 0 })}
                </h3>
                {options.participantNames && options.participantNames.length > 0 ? (
                  <ul className="space-y-2">
                    {options.participantNames.map((name, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <span className="text-sm text-gray-900">{name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParticipant(index)}
                          className="h-6 w-6 text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">{t('create.noParticipants')}</p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('options')}
                >
                  {t('common.back')}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={(options.participantNames?.length || 0) < 2}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('create.createTournament')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
