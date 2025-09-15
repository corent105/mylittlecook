'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, CheckCircle, X, Clock, Users } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const token = params.token as string;

  // Get invitation details
  const { data: invitation, isLoading, error } = api.profileInvitation.getInvitationByToken.useQuery({
    token,
  }, {
    enabled: !!token
  });

  // Accept invitation mutation
  const acceptInvitationMutation = api.profileInvitation.acceptInvitation.useMutation({
    onSuccess: (mealUser) => {
      showAlert(
        'Invitation acceptée !',
        `Vous êtes maintenant lié(e) au profil "${mealUser.pseudo}". Vous pouvez accéder au planning des repas.`,
        'success',
        {
          confirmText: 'Aller au planning',
          onConfirm: () => {
            router.push('/planning');
          }
        }
      );
    },
    onError: (error) => {
      showAlert(
        'Erreur',
        error.message || 'Impossible d\'accepter l\'invitation. Veuillez réessayer.',
        'error'
      );
    }
  });

  const handleAcceptInvitation = async () => {
    if (!session?.user?.email) {
      showAlert(
        'Connexion requise',
        'Vous devez être connecté pour accepter cette invitation.',
        'warning'
      );
      return;
    }

    if (invitation?.email !== session.user.email) {
      showAlert(
        'Email incompatible',
        'Cette invitation a été envoyée à une autre adresse email. Connectez-vous avec le bon compte.',
        'error'
      );
      return;
    }

    await acceptInvitationMutation.mutateAsync({ token });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4 text-center">
          <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invitation non trouvée
          </h1>
          <p className="text-gray-600 mb-6">
            Cette invitation n'existe pas ou n'est plus valide.
          </p>
          <Link href="/planning">
            <Button className="bg-orange-600 hover:bg-orange-700">
              Retour au planning
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isExpired = invitation.expiresAt < new Date();
  const isUsed = !!invitation.usedAt;
  const isValidInvitation = !isExpired && !isUsed;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invitation à rejoindre un foyer
          </h1>

          {/* Invitation details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Invité par :</span>
                <span className="text-sm font-medium">{invitation.inviter.name || invitation.inviter.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Profil :</span>
                <span className="text-sm font-medium">{invitation.mealUser.pseudo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pour :</span>
                <span className="text-sm font-medium">{invitation.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expire le :</span>
                <span className="text-sm font-medium">
                  {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>

          {/* Status and actions */}
          {isUsed ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-green-600 font-medium mb-2">
                Cette invitation a déjà été acceptée
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Acceptée le {invitation.usedAt ? new Date(invitation.usedAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
              </p>
              <Link href="/planning">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  Aller au planning
                </Button>
              </Link>
            </div>
          ) : isExpired ? (
            <div className="text-center">
              <Clock className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">
                Cette invitation a expiré
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Contactez la personne qui vous a invité pour recevoir une nouvelle invitation.
              </p>
              <Link href="/planning">
                <Button variant="outline">
                  Retour au planning
                </Button>
              </Link>
            </div>
          ) : !session ? (
            <div className="text-center">
              <Users className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Vous devez être connecté pour accepter cette invitation.
              </p>
              <Link href="/auth/signin">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  Se connecter
                </Button>
              </Link>
            </div>
          ) : session.user.email !== invitation.email ? (
            <div className="text-center">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">
                Email incompatible
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Cette invitation a été envoyée à <strong>{invitation.email}</strong> mais vous êtes connecté avec <strong>{session.user.email}</strong>.
              </p>
              <div className="space-y-2">
                <Link href="/auth/signin">
                  <Button variant="outline" className="w-full">
                    Se connecter avec le bon compte
                  </Button>
                </Link>
                <Link href="/planning">
                  <Button variant="ghost" className="w-full">
                    Retour au planning
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">
                Accepter cette invitation vous permettra de participer au planning des repas de ce foyer en tant que <strong>{invitation.mealUser.pseudo}</strong>.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={acceptInvitationMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  {acceptInvitationMutation.isPending ? 'Acceptation...' : 'Accepter l\'invitation'}
                </Button>
                <Link href="/planning">
                  <Button variant="outline" className="w-full">
                    Peut-être plus tard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>
      <AlertDialogComponent />
    </div>
  );
}