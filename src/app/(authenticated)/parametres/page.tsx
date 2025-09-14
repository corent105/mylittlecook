'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { Settings, Users, Save, Plus, Edit, Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const { showAlert, AlertDialogComponent } = useAlertDialog();

  // Get current user settings
  const { data: userSettings, isLoading: settingsLoading } = api.userSettings.get.useQuery();

  // Get user's meal users
  const { data: mealUsers = [], refetch: refetchMealUsers } = api.mealUser.getMyHouseholdProfiles.useQuery();

  const updateSettingsMutation = api.userSettings.update.useMutation({
    onSuccess: () => {
      // Invalidate cache to refresh the data
      utils.userSettings.get.invalidate();
    },
  });

  const utils = api.useContext();

  // Meal user mutations
  const createMealUserMutation = api.mealUser.create.useMutation({
    onSuccess: () => {
      refetchMealUsers();
      setNewProfileName('');
      setIsCreatingProfile(false);
      showAlert(
        'Profil créé',
        'Le nouveau profil a été créé avec succès !',
        'success'
      );
    },
    onError: (error) => {
      showAlert(
        'Erreur',
        'Impossible de créer le profil. Veuillez réessayer.',
        'error'
      );
    }
  });

  const updateMealUserMutation = api.mealUser.update.useMutation({
    onSuccess: () => {
      refetchMealUsers();
      setEditingProfile(null);
      showAlert(
        'Profil modifié',
        'Le profil a été modifié avec succès !',
        'success'
      );
    },
    onError: (error) => {
      showAlert(
        'Erreur',
        'Impossible de modifier le profil. Veuillez réessayer.',
        'error'
      );
    }
  });

  const deleteMealUserMutation = api.mealUser.delete.useMutation({
    onSuccess: () => {
      refetchMealUsers();
      showAlert(
        'Profil supprimé',
        'Le profil a été supprimé avec succès !',
        'success'
      );
    },
    onError: (error) => {
      showAlert(
        'Erreur',
        'Impossible de supprimer le profil. Veuillez réessayer.',
        'error'
      );
    }
  });

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      showAlert(
        'Nom requis',
        'Veuillez entrer un nom pour le profil.',
        'warning'
      );
      return;
    }

    await createMealUserMutation.mutateAsync({
      pseudo: newProfileName.trim()
    });
  };

  const handleUpdateProfile = async (id: string, newPseudo: string) => {
    if (!newPseudo.trim()) {
      showAlert(
        'Nom requis',
        'Veuillez entrer un nom pour le profil.',
        'warning'
      );
      return;
    }

    await updateMealUserMutation.mutateAsync({
      id,
      pseudo: newPseudo.trim()
    });
  };

  const handleDeleteProfile = (id: string, pseudo: string) => {
    showAlert(
      'Supprimer le profil',
      `Êtes-vous sûr de vouloir supprimer le profil "${pseudo}" ?`,
      'warning',
      {
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        onConfirm: async () => {
          await deleteMealUserMutation.mutateAsync({ id });
        }
      }
    );
  };

  const handleSaveSettings = async (formData: FormData) => {
    setIsLoading(true);
    try {
      const defaultPeopleCount = parseInt(formData.get('defaultPeopleCount') as string);
      
      await updateSettingsMutation.mutateAsync({
        defaultPeopleCount,
      });
      
      showAlert(
        'Paramètres sauvegardés',
        'Vos paramètres ont été sauvegardés avec succès !',
        'success'
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      showAlert(
        'Erreur de sauvegarde',
        'Impossible de sauvegarder les paramètres. Veuillez réessayer.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center mb-8">
          <Settings className="h-8 w-8 text-gray-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-600">
              Configurez vos préférences par défaut
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Default People Count Settings */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-xl font-semibold">Groupe par défaut</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Définissez le nombre de personnes par défaut pour vos repas. 
              Ce paramètre sera utilisé automatiquement lors de l'ajout de nouvelles recettes au planning.
            </p>

            {settingsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            ) : (
              <form action={handleSaveSettings}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="defaultPeopleCount" className="text-sm font-medium block">
                      Nombre de personnes par défaut
                    </label>
                    <Input
                      id="defaultPeopleCount"
                      name="defaultPeopleCount"
                      type="number"
                      min="1"
                      max="20"
                      defaultValue={userSettings?.defaultPeopleCount || 2}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Entre 1 et 20 personnes
                    </p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={isLoading || updateSettingsMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading || updateSettingsMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Current Meal Users */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-gray-600 mr-2" />
                <h2 className="text-xl font-semibold">Vos profils</h2>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCreatingProfile(true)}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={createMealUserMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau profil
              </Button>
            </div>

            <p className="text-gray-600 mb-6">
              Gérez vos profils de personnes pour le planning des repas.
            </p>

            {/* Create new profile form */}
            {isCreatingProfile && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-3">Créer un nouveau profil</h4>
                <div className="flex gap-3">
                  <Input
                    placeholder="Nom du profil"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateProfile();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateProfile}
                    disabled={createMealUserMutation.isPending || !newProfileName.trim()}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {createMealUserMutation.isPending ? 'Création...' : 'Créer'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreatingProfile(false);
                      setNewProfileName('');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {mealUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun profil créé</p>
                <p className="text-sm text-gray-400">
                  Cliquez sur "Nouveau profil" pour créer votre premier profil.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mealUsers.map((mealUser, index) => (
                  <div
                    key={mealUser.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center flex-1">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-orange-600 font-medium text-sm">
                          {index + 1}
                        </span>
                      </div>
                      {editingProfile?.id === mealUser.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingProfile.pseudo}
                            onChange={(e) => setEditingProfile({...editingProfile, pseudo: e.target.value})}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateProfile(editingProfile.id, editingProfile.pseudo);
                              }
                            }}
                            className="flex-1 max-w-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateProfile(editingProfile.id, editingProfile.pseudo)}
                            disabled={updateMealUserMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            {updateMealUserMutation.isPending ? 'Sauvegarde...' : 'Sauver'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProfile(null)}
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between flex-1">
                          <span className="font-medium">{mealUser.pseudo}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Créé le {new Date(mealUser.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProfile({id: mealUser.id, pseudo: mealUser.pseudo})}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProfile(mealUser.id, mealUser.pseudo)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deleteMealUserMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <AlertDialogComponent />
    </div>
  );
}