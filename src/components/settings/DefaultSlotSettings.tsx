'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Copy, RotateCcw, Users, ChefHat, Plus, Settings } from "lucide-react";
import { api } from "@/trpc/react";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import { MealType } from "@prisma/client";
import { MEAL_TYPES_LABELS } from "@/types/default-slot-settings";
import { DAYS_FRENCH } from "@/lib/constants/calendar";
import DefaultSlotConfigModal from './DefaultSlotConfigModal';

const MEAL_TYPES_ARRAY: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER'];

export default function DefaultSlotSettings() {
  const [selectedSlot, setSelectedSlot] = useState<{day: number, mealType: MealType} | null>(null);
  const [copySourceDay, setCopySourceDay] = useState<number | null>(null);
  const { showAlert, AlertDialogComponent } = useAlertDialog();

  // Get user's meal users
  const { data: mealUsers = [] } = api.mealUser.getMyHouseholdProfiles.useQuery();

  // Get user's default slot settings
  const { data: userSettings = [], refetch: refetchSettings } = api.defaultSlotSettings.getUserSettings.useQuery();

  // Mutations
  const upsertSettingMutation = api.defaultSlotSettings.upsertSlotSetting.useMutation();
  const copyDayMutation = api.defaultSlotSettings.copyDaySettings.useMutation();
  const resetAllMutation = api.defaultSlotSettings.resetAllSettings.useMutation();

  // Helper function to get setting for a specific slot
  const getSettingForSlot = (dayOfWeek: number, mealType: MealType) => {
    return userSettings.find(setting =>
      setting.dayOfWeek === dayOfWeek && setting.mealType === mealType
    );
  };

  const handleSlotClick = (day: number, mealType: MealType) => {
    setSelectedSlot({ day, mealType });
  };

  const handleSaveSlotConfig = async (mealUserIds: string[], cookResponsibleId?: string) => {
    if (!selectedSlot) return;

    try {
      await upsertSettingMutation.mutateAsync({
        dayOfWeek: selectedSlot.day,
        mealType: selectedSlot.mealType,
        mealUserIds,
        defaultCookResponsibleId: cookResponsibleId,
      });

      refetchSettings();

      showAlert(
        'Configuration sauvegardée',
        'Les paramètres par défaut ont été mis à jour avec succès !',
        'success'
      );
    } catch (error) {
      showAlert(
        'Erreur',
        'Impossible de sauvegarder la configuration. Veuillez réessayer.',
        'error'
      );
    }
  };

  const handleCopyDay = async (targetDay: number) => {
    if (copySourceDay === null) return;

    try {
      await copyDayMutation.mutateAsync({
        sourceDayOfWeek: copySourceDay,
        targetDayOfWeek: targetDay
      });

      setCopySourceDay(null);
      refetchSettings();

      showAlert(
        'Jour copié',
        `Les paramètres du ${DAYS_FRENCH[copySourceDay]} ont été copiés vers le ${DAYS_FRENCH[targetDay]}.`,
        'success'
      );
    } catch (error) {
      showAlert(
        'Erreur',
        'Impossible de copier les paramètres. Veuillez réessayer.',
        'error'
      );
    }
  };

  const handleResetAll = () => {
    showAlert(
      'Réinitialiser tous les paramètres',
      'Êtes-vous sûr de vouloir supprimer tous vos paramètres par défaut ? Cette action est irréversible.',
      'warning',
      {
        confirmText: 'Réinitialiser',
        cancelText: 'Annuler',
        onConfirm: async () => {
          try {
            await resetAllMutation.mutateAsync();
            refetchSettings();

            showAlert(
              'Paramètres réinitialisés',
              'Tous vos paramètres par défaut ont été supprimés.',
              'success'
            );
          } catch (error) {
            showAlert(
              'Erreur',
              'Impossible de réinitialiser les paramètres. Veuillez réessayer.',
              'error'
            );
          }
        }
      }
    );
  };

  const renderSlotCard = (dayIndex: number, mealType: MealType) => {
    const setting = getSettingForSlot(dayIndex, mealType);
    const hasSettings = setting && setting.defaultAssignments.length > 0;

    return (
      <Card
        key={`${dayIndex}-${mealType}`}
        className={`min-h-32 p-3 cursor-pointer hover:shadow-md transition-all duration-200 ${
          hasSettings
            ? 'border-solid border-orange-200 bg-orange-50/50'
            : 'border-dashed border-gray-300 hover:border-orange-300'
        }`}
        onClick={() => handleSlotClick(dayIndex, mealType)}
      >
        {hasSettings ? (
          <div className="space-y-2">
            {/* Participants */}
            <div className="text-sm">
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">
                  {setting.defaultAssignments.length} participant{setting.defaultAssignments.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {setting.defaultAssignments.slice(0, 3).map(assignment => (
                  <span
                    key={assignment.mealUserId}
                    className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded"
                  >
                    {assignment.mealUser.pseudo}
                  </span>
                ))}
                {setting.defaultAssignments.length > 3 && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    +{setting.defaultAssignments.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Cook Responsible */}
            {setting.defaultCookResponsible && (
              <div className="text-sm">
                <div className="flex items-center gap-1 mb-1">
                  <ChefHat className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">Responsable cuisine</span>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center w-fit">
                  👨‍🍳 {setting.defaultCookResponsible.pseudo}
                </span>
              </div>
            )}

            {/* Edit icon on hover */}
            <div className="flex items-center justify-center py-1 text-gray-400 hover:text-orange-500 transition-colors border-t border-dashed border-orange-200">
              <div className="text-center">
                <Settings className="h-3 w-3 mx-auto mb-0.5" />
                <div className="text-xs">Modifier</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-20 text-gray-400 hover:text-orange-500 transition-colors">
            <div className="text-center">
              <Plus className="h-6 w-6 mx-auto mb-1" />
              <div className="text-xs">Configurer</div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  if (mealUsers.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Calendar className="h-6 w-6 text-gray-600 mr-2" />
          <h2 className="text-xl font-semibold">Paramètres par défaut des créneaux</h2>
        </div>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Aucun profil disponible</p>
          <p className="text-sm text-gray-400">
            Créez d'abord des profils pour configurer les paramètres par défaut des créneaux.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold">Paramètres par défaut des créneaux</h2>
          </div>
          <div className="flex items-center gap-2">
            {copySourceDay !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCopySourceDay(null)}
                className="text-gray-600"
              >
                Annuler copie
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={resetAllMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Tout réinitialiser
            </Button>
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          Configurez les participants et responsables par défaut pour chaque créneau de votre semaine type. Cliquez sur une carte pour la configurer.
        </p>

        {/* Planning Grid - similar to the main planning */}
        <div className="md:grid md:grid-cols-8 md:gap-4 mb-8">
          {/* Desktop Grid */}
          <div className="hidden md:contents">
            {/* Header Row */}
            <div className="font-medium text-gray-700"></div>
            {DAYS_FRENCH.map((day, index) => (
              <div key={day} className="text-center font-medium text-gray-700 py-2 relative">
                {day}
                {copySourceDay !== null && copySourceDay !== index && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyDay(index)}
                    disabled={copyDayMutation.isPending}
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={`Coller les paramètres du ${DAYS_FRENCH[copySourceDay]}`}
                  >
                    ↓
                  </Button>
                )}
              </div>
            ))}

            {/* Meal Rows */}
            {MEAL_TYPES_ARRAY.map((mealType) => (
              <div key={mealType} className="contents">
                <div className="flex items-center justify-between font-medium text-gray-700 py-4">
                  <span>{MEAL_TYPES_LABELS[mealType]}</span>
                </div>
                {DAYS_FRENCH.map((_, dayIndex) => (
                  <div key={`${dayIndex}-${mealType}`} className="relative">
                    {renderSlotCard(dayIndex, mealType)}
                    {/* Copy button for each day */}
                    <div className="absolute top-1 right-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCopySourceDay(copySourceDay === dayIndex ? null : dayIndex);
                        }}
                        className={`h-6 w-6 p-0 ${copySourceDay === dayIndex ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                        title={copySourceDay === dayIndex ? 'Annuler la sélection' : 'Copier ce jour'}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Mobile Grid Layout */}
          <div className="md:hidden">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-3 px-4 pb-4 pt-2" style={{ width: 'max-content' }}>
                {/* Header Row */}
                {DAYS_FRENCH.map((day, dayIndex) => (
                  <div key={`header-${dayIndex}`} className="text-center text-sm font-medium text-gray-700 mb-3 w-48 relative">
                    {day}
                    {copySourceDay !== null && copySourceDay !== dayIndex && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyDay(dayIndex)}
                        disabled={copyDayMutation.isPending}
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 h-5 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                        title={`Coller les paramètres du ${DAYS_FRENCH[copySourceDay]}`}
                      >
                        ↓
                      </Button>
                    )}
                  </div>
                ))}

                {/* Meal Type Rows */}
                {MEAL_TYPES_ARRAY.map((mealType) => (
                  DAYS_FRENCH.map((_, dayIndex) => (
                    <div key={`${dayIndex}-${mealType}`} className="w-48 py-2 relative">
                      <div className="text-xs font-medium text-gray-600 mb-1 px-1">
                        {MEAL_TYPES_LABELS[mealType]}
                      </div>
                      {renderSlotCard(dayIndex, mealType)}
                      {/* Copy button for mobile */}
                      <div className="absolute top-8 right-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCopySourceDay(copySourceDay === dayIndex ? null : dayIndex);
                          }}
                          className={`h-5 w-5 p-0 ${copySourceDay === dayIndex ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                          title={copySourceDay === dayIndex ? 'Annuler la sélection' : 'Copier ce jour'}
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>
            💡 <strong>Astuce :</strong> Cliquez sur l'icône de copie pour dupliquer les paramètres d'un jour vers un autre.
          </p>
        </div>
      </Card>

      {/* Configuration Modal */}
      <DefaultSlotConfigModal
        isOpen={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        selectedSlot={selectedSlot}
        mealUsers={mealUsers}
        defaultSetting={selectedSlot ? getSettingForSlot(selectedSlot.day, selectedSlot.mealType) : null}
        onSave={handleSaveSlotConfig}
        isLoading={upsertSettingMutation.isPending}
      />

      <AlertDialogComponent />
    </>
  );
}