'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Plus, Search, Edit, Trash2, Clock, Users, Download } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('my-recipes');
  const { data: session } = useSession();

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
    if (confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
      try {
        await deleteRecipeMutation.mutateAsync({ id });
      } catch (error) {
        console.error('Error deleting recipe:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
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

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>

        {/* Tabs */}
        {!searchQuery && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="my-recipes">
                Mes recettes ({myRecipes?.recipes.length || 0})
              </TabsTrigger>
              <TabsTrigger value="others-recipes">
                Autres recettes ({othersRecipes?.recipes.length || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-md mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Recipes Grid */}
        {!isLoading && (
          <>
            {getDisplayedRecipes().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getDisplayedRecipes().map((recipe) => (
                  <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Recipe Image */}
                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChefHat className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Recipe Info */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
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
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                        {recipe.prepTime && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {recipe.prepTime} min
                          </div>
                        )}
                        {recipe.servings && (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {recipe.servings} pers.
                          </div>
                        )}
                      </div>

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
                      <div className="flex justify-between items-center">
                        <Link href={`/recettes/${recipe.id}`}>
                          <Button variant="outline" size="sm">
                            Voir la recette
                          </Button>
                        </Link>
                        <div className="flex space-x-2">
                          {/* Show edit/delete buttons only for user's own recipes */}
                          {session?.user?.id === recipe.authorId && (
                            <>
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
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ChefHat className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'Aucune recette trouvée' : 'Aucune recette'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery 
                    ? 'Essayez de modifier votre recherche'
                    : 'Commencez par créer votre première recette'
                  }
                </p>
                {!searchQuery && (
                  <Link href="/recettes/nouvelle">
                    <Button className="bg-orange-600 hover:bg-orange-700">
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
    </div>
  );
}