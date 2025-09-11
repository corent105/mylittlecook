"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, X, User } from "lucide-react";

interface HouseholdProfile {
  id?: string;
  pseudo: string;
  userId?: string;
}

export default function HouseholdSetupPage() {
  const router = useRouter();
  const { update } = useSession();
  const [profiles, setProfiles] = useState<HouseholdProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [hasInitialized, setHasInitialized] = useState(false);

  const createInitialProfile = api.mealUser.createInitialProfile.useMutation({
    onSuccess: (initialProfile) => {
      setProfiles([{
        id: initialProfile.id,
        pseudo: initialProfile.pseudo,
        userId: initialProfile.userId || undefined
      }]);
      setHasInitialized(true);
    }
  });

  const createProfile = api.mealUser.create.useMutation();
  const updateProfile = api.mealUser.update.useMutation();

  const handleInitialSetup = async () => {
    if (hasInitialized) return;
    
    try {
      await createInitialProfile.mutateAsync();
    } catch (error) {
      console.error("Erreur lors de la création du profil initial:", error);
      setHasInitialized(true); // Éviter les boucles infinies
    }
  };

  const addProfile = () => {
    setProfiles([...profiles, { pseudo: "" }]);
  };

  const removeProfile = (index: number) => {
    setProfiles(profiles.filter((_, i) => i !== index));
  };

  const updateProfilePseudo = (index: number, pseudo: string) => {
    const updatedProfiles = [...profiles];
    updatedProfiles[index].pseudo = pseudo;
    setProfiles(updatedProfiles);
  };

  const handleFinishSetup = async () => {
    setIsLoading(true);
    try {
      // Si aucun profil initial n'a été créé, le créer d'abord
      if (profiles.length === 0) {
        await createInitialProfile.mutateAsync();
      }

      // Créer ou mettre à jour tous les profils
      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i];
        if (profile.pseudo.trim()) {
          if (profile.id) {
            // Mettre à jour le profil existant
            await updateProfile.mutateAsync({
              id: profile.id,
              pseudo: profile.pseudo.trim()
            });
          } else {
            // Créer un nouveau profil
            await createProfile.mutateAsync({
              pseudo: profile.pseudo.trim()
            });
          }
        }
      }

      // Mettre à jour la session pour refléter que l'onboarding est terminé
      await update({ hasCompletedOnboarding: true });
      
      // Rediriger vers le planning
      router.push("/planning");
    } catch (error) {
      console.error("Erreur lors de la configuration du foyer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Marquer comme monté côté client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Créer le profil initial côté client uniquement
  useEffect(() => {
    if (isMounted && profiles.length === 0 && !createInitialProfile.isPending && !hasInitialized) {
      handleInitialSetup();
    }
  }, [isMounted, profiles.length, createInitialProfile.isPending, hasInitialized]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Configurez votre foyer
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ajoutez les personnes qui composent votre foyer pour organiser vos repas ensemble
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!isMounted || createInitialProfile.isPending ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">
                {!isMounted ? "Chargement..." : "Création de votre profil..."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {profiles.map((profile, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-white rounded-lg border">
                    <div className="flex-shrink-0">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`profile-${index}`} className="sr-only">
                        Nom du profil {index + 1}
                      </Label>
                      <Input
                        id={`profile-${index}`}
                        type="text"
                        placeholder="Nom du membre du foyer"
                        value={profile.pseudo}
                        onChange={(e) => updateProfilePseudo(index, e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProfile(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addProfile}
                className="w-full border-dashed border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une personne
              </Button>

              <div className="flex justify-end space-x-3 pt-6">
                <Button
                  onClick={handleFinishSetup}
                  disabled={isLoading || profiles.every(p => !p.pseudo.trim())}
                  className="px-8"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Configuration...
                    </>
                  ) : (
                    "Terminer"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}