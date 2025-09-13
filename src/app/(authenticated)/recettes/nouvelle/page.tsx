'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, Save, ArrowLeft, Download, Plus, Minus, X } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import RecipeTypeSelector from "@/components/recipe/RecipeTypeSelector";
import { RecipeCategoryType } from '@prisma/client';

// Import MDEditor dynamically to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

interface RecipeForm {
  title: string;
  description: string;
  content: string;
  imageUrl: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: RecipeIngredient[];
  types: string[];
}

export default function NewRecipePage() {
  const router = useRouter();
  const [form, setForm] = useState<RecipeForm>({
    title: '',
    description: '',
    content: `# Ma Nouvelle Recette

## Instructions

1. **Étape 1** : Description de la première étape
2. **Étape 2** : Description de la deuxième étape
3. **Étape 3** : Description de la troisième étape

## Notes

Ajoutez ici vos notes personnelles, astuces ou variations de la recette.`,
    imageUrl: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    ingredients: [],
    types: [],
  });

  const createRecipeMutation = api.recipe.create.useMutation({
    onSuccess: (data) => {
      router.push(`/recettes/${data.id}`);
    },
    onError: (error) => {
      console.error('Error creating recipe:', error);
      alert('Erreur lors de la création de la recette');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert('Le titre est obligatoire');
      return;
    }

    if (!form.content.trim()) {
      alert('Le contenu de la recette est obligatoire');
      return;
    }

    if (form.types.length === 0) {
      alert('Veuillez sélectionner au moins un type de recette');
      return;
    }

    // Filter out empty ingredients and convert quantity to number
    const validIngredients = form.ingredients
      .filter(ing => ing.name.trim() && ing.quantity.trim() && ing.unit)
      .map(ing => ({
        name: ing.name.trim(),
        quantity: parseFloat(ing.quantity),
        unit: ing.unit,
        notes: ing.notes.trim() || undefined,
      }));

    try {
      await createRecipeMutation.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        content: form.content,
        imageUrl: form.imageUrl || undefined,
        prepTime: form.prepTime ? parseInt(form.prepTime) : undefined,
        cookTime: form.cookTime ? parseInt(form.cookTime) : undefined,
        servings: form.servings ? parseInt(form.servings) : undefined,
        ingredients: validIngredients.length > 0 ? validIngredients : undefined,
        types: form.types as RecipeCategoryType[],
      });
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  const updateForm = (field: keyof RecipeForm, value: string | RecipeIngredient[] | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addIngredient = () => {
    const newIngredient: RecipeIngredient = {
      id: crypto.randomUUID(),
      name: '',
      quantity: '',
      unit: '',
      notes: '',
    };
    setForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient]
    }));
  };

  const updateIngredient = (id: string, field: keyof RecipeIngredient, value: string) => {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const removeIngredient = (id: string) => {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== id)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/recettes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux recettes
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Nouvelle Recette</h2>
              <p className="text-gray-600">Créez votre recette avec l'éditeur Markdown</p>
            </div>
          </div>
          <Link href="/recettes/importer">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Importer depuis un lien
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Recipe Info */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Titre de la recette *
                    </label>
                    <Input
                      value={form.title}
                      onChange={(e) => updateForm('title', e.target.value)}
                      placeholder="Ex: Pâtes à la carbonara"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description courte
                    </label>
                    <Input
                      value={form.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                      placeholder="Une délicieuse recette italienne..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      URL de l'image
                    </label>
                    <Input
                      value={form.imageUrl}
                      onChange={(e) => updateForm('imageUrl', e.target.value)}
                      placeholder="https://..."
                      type="url"
                    />
                  </div>
                </div>
              </Card>

              {/* Recipe Types */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Types de recette <span className="text-red-500">*</span>
                </h3>
                <RecipeTypeSelector
                  selectedTypes={form.types}
                  onTypesChange={(types) => updateForm('types', types)}
                />
                {form.types.length === 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    Veuillez sélectionner au moins un type de recette
                  </p>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Ingrédients</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addIngredient}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {form.ingredients.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      Aucun ingrédient ajouté. Cliquez sur "Ajouter" pour commencer.
                    </p>
                  ) : (
                    form.ingredients.map((ingredient) => (
                      <div key={ingredient.id} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="col-span-5">
                          <Input
                            placeholder="Nom de l'ingrédient"
                            value={ingredient.name}
                            onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder="Qté"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(ingredient.id, 'quantity', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={ingredient.unit}
                            onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md"
                          >
                            <option value="">Unité</option>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="l">l</option>
                            <option value="cl">cl</option>
                            <option value="pièce">pièce</option>
                            <option value="cuillère à soupe">c. à soupe</option>
                            <option value="cuillère à café">c. à café</option>
                            <option value="tasse">tasse</option>
                            <option value="pincée">pincée</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder="Notes"
                            value={ingredient.notes}
                            onChange={(e) => updateIngredient(ingredient.id, 'notes', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeIngredient(ingredient.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Détails</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Temps de préparation (minutes)
                    </label>
                    <Input
                      value={form.prepTime}
                      onChange={(e) => updateForm('prepTime', e.target.value)}
                      placeholder="15"
                      type="number"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Temps de cuisson (minutes)
                    </label>
                    <Input
                      value={form.cookTime}
                      onChange={(e) => updateForm('cookTime', e.target.value)}
                      placeholder="30"
                      type="number"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre de personnes
                    </label>
                    <Input
                      value={form.servings}
                      onChange={(e) => updateForm('servings', e.target.value)}
                      placeholder="4"
                      type="number"
                      min="1"
                    />
                  </div>
                </div>
              </Card>

              {/* Preview Card */}
              {form.imageUrl && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-2">Aperçu de l'image</h3>
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </Card>
              )}
            </div>

            {/* Right Column - Markdown Editor */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Contenu de la recette</h3>
                  <div className="text-sm text-gray-600">
                    Utilisez Markdown pour formater votre recette
                  </div>
                </div>
                
                <div className="prose-container">
                  <MDEditor
                    value={form.content}
                    onChange={(val) => updateForm('content', val || '')}
                    height={600}
                    preview="edit"
                    data-color-mode="light"
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Link href="/recettes">
              <Button variant="outline">Annuler</Button>
            </Link>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700"
              disabled={createRecipeMutation.isPending}
            >
              {createRecipeMutation.isPending ? (
                'Création...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Créer la recette
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}