'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { Settings, Users, Save } from "lucide-react";
import { api } from "@/trpc/react";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Get current user settings
  const { data: userSettings, isLoading: settingsLoading } = api.userSettings.get.useQuery();
  
  // Get user's meal users
  const { data: mealUsers = [] } = api.mealUser.getMyHouseholdProfiles.useQuery();

  const updateSettingsMutation = api.userSettings.update.useMutation({
    onSuccess: () => {
      // Invalidate cache to refresh the data
      utils.userSettings.get.invalidate();
    },
  });

  const utils = api.useContext();

  const handleSaveSettings = async (formData: FormData) => {
    setIsLoading(true);
    try {
      const defaultPeopleCount = parseInt(formData.get('defaultPeopleCount') as string);
      
      await updateSettingsMutation.mutateAsync({
        defaultPeopleCount,
      });
      
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
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
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-xl font-semibold">Vos profils</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Liste de tous vos profils de personnes. Vous pouvez les gérer depuis la page de planification.
            </p>

            {mealUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun profil créé</p>
                <p className="text-sm text-gray-400">
                  Rendez-vous sur la page de planification pour créer vos premiers profils.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mealUsers.map((mealUser, index) => (
                  <div 
                    key={mealUser.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-orange-600 font-medium text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <span className="font-medium">{mealUser.pseudo}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Créé le {new Date(mealUser.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}