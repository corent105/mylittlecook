'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";

interface MealUserSelectionProps {
  mealUsers: any[];
  selectedMealUsers: string[];
  setSelectedMealUsers: (users: string[]) => void;
  onCreateMealUser: () => void;
  isCreatingMealUser: boolean;
}

export default function MealUserSelection({
  mealUsers,
  selectedMealUsers,
  setSelectedMealUsers,
  onCreateMealUser,
  isCreatingMealUser
}: MealUserSelectionProps) {
  if (mealUsers.length === 0) {
    return (
      <Card className="mb-6 sm:mb-8 p-4 sm:p-6">
        <div className="text-center">
          <Users className="h-10 sm:h-12 w-10 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">Créez votre premier profil</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Créez un profil (pseudo) pour commencer à planifier vos repas
          </p>
          <Button
            onClick={onCreateMealUser}
            className="bg-orange-600 hover:bg-orange-700"
            size="sm"
            disabled={isCreatingMealUser}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreatingMealUser ? 'Création...' : 'Créer un profil'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 sm:mb-8 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h3 className="font-semibold mb-2 text-sm sm:text-base">Profils actifs</h3>
          <div className="flex flex-wrap gap-2">
            {mealUsers.map(mealUser => (
              <Button
                key={mealUser.id}
                size="sm"
                variant={selectedMealUsers.includes(mealUser.id) ? "default" : "outline"}
                onClick={() => {
                  const userId = mealUser.id;
                  const isIncluded = selectedMealUsers.includes(userId);
                  const newUsers = isIncluded
                    ? selectedMealUsers.filter(id => id !== userId)
                    : [...selectedMealUsers, userId];
                  setSelectedMealUsers(newUsers);
                }}
                className={`text-xs sm:text-sm ${selectedMealUsers.includes(mealUser.id) ? "bg-orange-600 hover:bg-orange-700" : ""}`}
              >
                {mealUser.pseudo}
              </Button>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onCreateMealUser}
          className="self-start sm:self-auto"
          disabled={isCreatingMealUser}
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          {isCreatingMealUser ? 'Ajout...' : 'Ajouter'}
        </Button>
      </div>
    </Card>
  );
}