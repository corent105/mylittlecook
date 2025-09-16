'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { Settings, Users, Save, Plus, Edit, Trash2, Mail, Send, Clock, CheckCircle, X } from "lucide-react";
import { api } from "@/trpc/react";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import DefaultSlotSettings from "@/components/settings/DefaultSlotSettings";

export default function SettingsPage() {
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [invitingProfileId, setInvitingProfileId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const { showAlert, AlertDialogComponent } = useAlertDialog();



  // Get user's meal users
  const { data: mealUsers = [], refetch: refetchMealUsers } = api.mealUser.getMyHouseholdProfiles.useQuery();

  // Get sent invitations
  const { data: sentInvitations = [], refetch: refetchInvitations } = api.profileInvitation.getMySentInvitations.useQuery();
  
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

  // Invitation mutations
  const createInvitationMutation = api.profileInvitation.createInvitation.useMutation({
    onSuccess: () => {
      refetchInvitations();
      setInvitingProfileId(null);
      setInviteEmail('');
      showAlert(
        'Invitation envoyée',
        'L\'invitation a été envoyée avec succès !',
        'success'
      );
    },
    onError: (error) => {
      showAlert(
        'Erreur',
        error.message || 'Impossible d\'envoyer l\'invitation. Veuillez réessayer.',
        'error'
      );
    }
  });

  const cancelInvitationMutation = api.profileInvitation.cancelInvitation.useMutation({
    onSuccess: () => {
      refetchInvitations();
      showAlert(
        'Invitation annulée',
        'L\'invitation a été annulée avec succès !',
        'success'
      );
    },
    onError: (error) => {
      showAlert(
        'Erreur',
        'Impossible d\'annuler l\'invitation. Veuillez réessayer.',
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

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim() || !invitingProfileId) {
      showAlert(
        'Email requis',
        'Veuillez entrer un email valide.',
        'warning'
      );
      return;
    }

    await createInvitationMutation.mutateAsync({
      mealUserId: invitingProfileId,
      email: inviteEmail.trim()
    });
  };

  const handleCancelInvitation = (invitationId: string) => {
    showAlert(
      'Annuler l\'invitation',
      'Êtes-vous sûr de vouloir annuler cette invitation ?',
      'warning',
      {
        confirmText: 'Annuler l\'invitation',
        cancelText: 'Garder',
        onConfirm: async () => {
          await cancelInvitationMutation.mutateAsync({ invitationId });
        }
      }
    );
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

        <div className="space-y-8">
          {/* Default Slot Settings */}
          <DefaultSlotSettings />

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
                          <div className="flex-1">
                            <span className="font-medium">{mealUser.pseudo}</span>
                            {mealUser.user ? (
                              <div className="text-xs text-green-600 mt-1">
                                ✓ Lié à {mealUser.user.name || mealUser.user.email}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 mt-1">
                                Non lié à un utilisateur
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Créé le {new Date(mealUser.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                            {!mealUser.user && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInvitingProfileId(mealUser.id)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Inviter quelqu'un pour ce profil"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
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

            {/* Send invitation form */}
            {invitingProfileId && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-3">
                  Inviter quelqu'un pour le profil "{mealUsers.find(mu => mu.id === invitingProfileId)?.pseudo}"
                </h4>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="Email de la personne à inviter"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendInvitation();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendInvitation}
                    disabled={createInvitationMutation.isPending || !inviteEmail.trim()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {createInvitationMutation.isPending ? 'Envoi...' : 'Envoyer'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInvitingProfileId(null);
                      setInviteEmail('');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* List of sent invitations */}
            {sentInvitations.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-800 mb-3">Invitations envoyées</h4>
                <div className="space-y-2">
                  {sentInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center flex-1">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {invitation.email} → {invitation.mealUser.pseudo}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            {invitation.usedAt ? (
                              <span className="text-green-600 flex items-center">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Acceptée le {new Date(invitation.usedAt).toLocaleDateString('fr-FR')}
                              </span>
                            ) : invitation.expiresAt < new Date() ? (
                              <span className="text-red-600 flex items-center">
                                <X className="h-3 w-3 mr-1" />
                                Expirée le {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}
                              </span>
                            ) : (
                              <span className="text-orange-600 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Expire le {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!invitation.usedAt && invitation.expiresAt > new Date() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={cancelInvitationMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      <AlertDialogComponent />
    </div>
  );
}