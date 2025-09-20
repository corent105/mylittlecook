'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Plus, Search, Edit, Trash2, Clock, Users, Download } from "lucide-react";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import { api } from "@/components/providers/trpc-provider";
import { useSession } from "next-auth/react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from "@/lib/constants/recipe-types";
import { RecipeCardSkeleton } from "@/components/skeleton/RecipeCardSkeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('my-recipes');
  const { data: session } = useSession();
  const { showAlert, AlertDialogComponent } = useAlertDialog();

  const { data: myRecipes, isLoading: isLoadingMyRecipes, refetch: refetchMyRecipes } = api.recipe.getMyRecipes.useQuery({
    limit: 50,
  });

  const { data: othersRecipes, isLoading: isLoadingOthersRecipes, refetch: refetchOthersRecipes } = api.recipe.getOthersRecipes.useQuery({
    limit: 50,
  });

  const { data: searchResults = [] } = api.recipe.search.useQuery({
    query: searchQuery,
    limit: 20,
  }, {
    enabled: searchQuery.length > 0,
  });

  const deleteRecipeMutation = api.recipe.delete.useMutation({
    onSuccess: () => {
      refetchMyRecipes();
      refetchOthersRecipes();
    },
  });

  const getDisplayedRecipes = () => {
    if (searchQuery.length > 0) {
      return searchResults;
    }
    if (activeTab === 'my-recipes') {
      return myRecipes?.recipes || [];
    }
    return othersRecipes?.recipes || [];
  };

  const isLoading = isLoadingMyRecipes || isLoadingOthersRecipes;

  const handleDeleteRecipe = async (id: string) => {
    showAlert(
      'Supprimer la recette',
      'Êtes-vous sûr de vouloir supprimer cette recette ?',
      'warning',
      {
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        onConfirm: async () => {
          try {
            await deleteRecipeMutation.mutateAsync({ id });
          } catch (error) {
            console.error('Error deleting recipe:', error);
          }
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Recettes</h2>
              <p className="text-gray-600 text-sm">
                Découvrez et gérez toutes vos recettes
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Link href="/recettes/nouvelle">
                <Button className="bg-orange-600 hover:bg-orange-700 w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle recette
                </Button>
              </Link>
              <Link href="/recettes/importer">
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Importer depuis un lien
                </Button>
              </Link>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Recettes</h2>
              <p className="text-gray-600">
                Découvrez et gérez toutes vos recettes
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/recettes/importer">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Importer depuis un lien
                </Button>
              </Link>
              <Link href="/recettes/nouvelle">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle recette
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4 sm:mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full sm:max-w-md"
          />
        </div>

        {/* Tabs */}
        {!searchQuery && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-6">
            <TabsList className="grid w-full max-w-full sm:max-w-md grid-cols-2">
              <TabsTrigger value="my-recipes" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Mes recettes ({myRecipes?.recipes.length || 0})</span>
                <span className="sm:hidden">Mes recettes ({myRecipes?.recipes.length || 0})</span>
              </TabsTrigger>
              <TabsTrigger value="others-recipes" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Autres recettes ({othersRecipes?.recipes.length || 0})</span>
                <span className="sm:hidden">Autres ({othersRecipes?.recipes.length || 0})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Recipes Grid */}
        {!isLoading && (
          <>
            {getDisplayedRecipes().length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {getDisplayedRecipes().map((recipe) => (
                  <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Recipe Image */}
                    <div className="h-40 sm:h-48 bg-gray-200 relative overflow-hidden">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChefHat className="h-12 sm:h-16 w-12 sm:w-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Recipe Info */}
                    <div className="p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {recipe.title}
                      </h3>

                      {recipe.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}

                      {/* Author info (only show for others' recipes) */}
                      {session?.user?.id !== recipe.authorId && recipe.author && (
                        <p className="text-gray-500 text-xs mb-2">
                          Par {recipe.author.name || recipe.author.email}
                        </p>
                      )}

                      {/* Recipe Meta */}
                      <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                        {recipe.prepTime && (
                          <div className="flex items-center">
                            <Clock className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">{recipe.prepTime} min</span>
                          </div>
                        )}
                        {recipe.servings && (
                          <div className="flex items-center">
                            <Users className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">{recipe.servings} pers.</span>
                          </div>
                        )}
                      </div>

                      {/* Recipe Types */}
                      {recipe.types && recipe.types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {recipe.types.slice(0, 2).map((recipeType) => (
                            <RecipeTypeBadge
                              key={recipeType.id}
                              type={recipeType.type as keyof typeof RECIPE_TYPES}
                              size="sm"
                            />
                          ))}
                          {recipe.types.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{recipe.types.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Recipe Tags */}
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {recipe.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                            >
                              {tag.tag.name}
                            </span>
                          ))}
                          {recipe.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{recipe.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                        <Link href={`/recettes/${recipe.id}`} className="w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                            Voir la recette
                          </Button>
                        </Link>
                        {/* Show edit/delete buttons only for user's own recipes */}
                        {session?.user?.id === recipe.authorId && (
                          <div className="flex space-x-2 justify-end">
                            <Link href={`/recettes/${recipe.id}/modifier`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecipe(recipe.id)}
                              disabled={deleteRecipeMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deleteRecipeMutation.isPending ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 px-4">
                <ChefHat className="h-16 sm:h-24 w-16 sm:w-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'Aucune recette trouvée' : 'Aucune recette'}
                </h3>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">
                  {searchQuery
                    ? 'Essayez de modifier votre recherche'
                    : 'Commencez par créer votre première recette'
                  }
                </p>
                {!searchQuery && (
                  <Link href="/recettes/nouvelle">
                    <Button className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer ma première recette
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <AlertDialogComponent />
    </div>
  );
}