'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, Save, ArrowLeft, Download, Plus, Minus, X, ChevronUp, ChevronDown, Clock, Thermometer } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import {useParams, useRouter} from "next/navigation";
import RecipeTypeSelector from "@/components/recipe/RecipeTypeSelector";
import { RecipeCategoryType } from '@prisma/client';
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

interface RecipeStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  duration?: number;
  temperature?: string;
  notes?: string;
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
  steps: RecipeStep[];
  types: string[];
}

export default function EditRecipePage() {
  const params = useParams()
  const router = useRouter();
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const [form, setForm] = useState<RecipeForm>({
    title: '',
    description: '',
    content: '',
    imageUrl: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    ingredients: [],
    steps: [],
    types: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the recipe data
  const { data: recipe, isLoading: recipeLoading } = api.recipe.getById.useQuery({
    id: params.id as string
  });

  // Initialize form when recipe data is loaded
  useEffect(() => {
    if (recipe && !recipeLoading) {
      setForm({
        title: recipe.title || '',
        description: recipe.description || '',
        content: recipe.content || '',
        imageUrl: recipe.imageUrl || '',
        prepTime: recipe.prepTime ? recipe.prepTime.toString() : '',
        cookTime: recipe.cookTime ? recipe.cookTime.toString() : '',
        servings: recipe.servings ? recipe.servings.toString() : '',
        ingredients: recipe.ingredients?.map((ing: any) => ({
          id: crypto.randomUUID(),
          name: ing.ingredient.name || '',
          quantity: ing.quantity ? ing.quantity.toString() : '',
          unit: ing.notes?.includes('(') ? ing.notes.match(/\(([^)]+)\)/)?.[1] || '' : '',
          notes: ing.notes?.replace(/\s*\([^)]+\)/, '') || '',
        })) || [],
        steps: recipe.steps?.map((step: any) => ({
          id: step.id || crypto.randomUUID(),
          stepNumber: step.stepNumber || 1,
          title: step.title || '',
          instruction: step.instruction || '',
          duration: step.duration || undefined,
          temperature: step.temperature || '',
          notes: step.notes || '',
        })) || [],
        types: recipe.types?.map((type: any) => type.type) || [],
      });
      setIsLoading(false);
    }
  }, [recipe, recipeLoading]);

  const updateRecipeMutation = api.recipe.update.useMutation({
    onSuccess: (data) => {
      router.push(`/recettes/${data.id}`);
    },
    onError: (error) => {
      console.error('Error updating recipe:', error);
      showAlert(
        'Erreur de modification',
        'Erreur lors de la modification de la recette. Veuillez réessayer.',
        'error'
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      showAlert(
        'Titre manquant',
        'Le titre est obligatoire pour modifier une recette.',
        'warning'
      );
      return;
    }

    if (!form.content.trim()) {
      showAlert(
        'Contenu manquant',
        'Le contenu de la recette est obligatoire.',
        'warning'
      );
      return;
    }

    if (form.types.length === 0) {
      showAlert(
        'Type de recette requis',
        'Veuillez sélectionner au moins un type de recette.',
        'warning'
      );
      return;
    }

    if (form.steps.length === 0 || !form.steps.some(step => step.instruction.trim())) {
      showAlert(
        'Étapes manquantes',
        'Veuillez ajouter au moins une étape avec des instructions.',
        'warning'
      );
      return;
    }

    try {
      await updateRecipeMutation.mutateAsync({
        id: params.id as string,
        title: form.title,
        description: form.description || undefined,
        content: form.content,
        imageUrl: form.imageUrl || undefined,
        prepTime: form.prepTime ? parseInt(form.prepTime) : undefined,
        cookTime: form.cookTime ? parseInt(form.cookTime) : undefined,
        servings: form.servings ? parseInt(form.servings) : undefined,
        types: form.types as RecipeCategoryType[],
        steps: form.steps.map(step => ({
          stepNumber: step.stepNumber,
          title: step.title || undefined,
          instruction: step.instruction,
          duration: step.duration || undefined,
          temperature: step.temperature || undefined,
          notes: step.notes || undefined,
        })),
      });
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  const updateForm = (field: keyof RecipeForm, value: string | RecipeIngredient[] | RecipeStep[] | string[]) => {
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

  // Steps management functions
  const addStep = () => {
    const newStep: RecipeStep = {
      id: crypto.randomUUID(),
      stepNumber: form.steps.length + 1,
      title: '',
      instruction: '',
      duration: undefined,
      temperature: '',
      notes: '',
    };
    setForm(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const updateStep = (id: string, field: keyof RecipeStep, value: string | number | undefined) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === id ? { ...step, [field]: value } : step
      )
    }));
  };

  const removeStep = (id: string) => {
    setForm(prev => {
      const updatedSteps = prev.steps
        .filter(step => step.id !== id)
        .map((step, index) => ({ ...step, stepNumber: index + 1 }));
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  const moveStep = (id: string, direction: 'up' | 'down') => {
    setForm(prev => {
      const currentIndex = prev.steps.findIndex(step => step.id === id);
      if (
        (direction === 'up' && currentIndex === 0) ||
        (direction === 'down' && currentIndex === prev.steps.length - 1)
      ) {
        return prev;
      }

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const newSteps = [...prev.steps];
      [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];

      // Update step numbers
      const updatedSteps = newSteps.map((step, index) => ({ ...step, stepNumber: index + 1 }));

      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  if (isLoading || recipeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Chargement de la recette...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Recette introuvable</h2>
          <p className="text-gray-600 mb-4">La recette que vous cherchez n'existe pas.</p>
          <Link href="/recettes">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux recettes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href={`/recettes/${params.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la recette
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Modifier la Recette</h2>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            </div>
              <div className="lg:col-span-1 space-y-6">

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
                    className="w-full h-fit object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </Card>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Étapes de la recette</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addStep}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter une étape
                  </Button>
                </div>

                <div className="space-y-4 ">
                  {form.steps.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">
                      Aucune étape ajoutée. Cliquez sur "Ajouter une étape" pour commencer.
                    </p>
                  ) : (
                    form.steps
                      .sort((a, b) => a.stepNumber - b.stepNumber)
                      .map((step, index) => (
                        <div key={step.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2 py-1 rounded">
                                Étape {step.stepNumber}
                              </span>
                              <div className="flex space-x-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveStep(step.id, 'up')}
                                  disabled={index === 0}
                                  className="p-1 h-6 w-6"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveStep(step.id, 'down')}
                                  disabled={index === form.steps.length - 1}
                                  className="p-1 h-6 w-6"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeStep(step.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <Input
                                placeholder="Titre de l'étape (optionnel)"
                                value={step.title}
                                onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                                className="text-sm font-medium"
                              />
                            </div>

                            <div>
                              <textarea
                                placeholder="Instructions détaillées pour cette étape..."
                                value={step.instruction}
                                onChange={(e) => updateStep(step.id, 'instruction', e.target.value)}
                                className="w-full h-20 p-3 text-sm border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                required
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Durée (min)"
                                  type="number"
                                  value={step.duration || ''}
                                  onChange={(e) => updateStep(step.id, 'duration', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Thermometer className="h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Température"
                                  value={step.temperature || ''}
                                  onChange={(e) => updateStep(step.id, 'temperature', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <Input
                                placeholder="Notes supplémentaires (optionnel)"
                                value={step.notes || ''}
                                onChange={(e) => updateStep(step.id, 'notes', e.target.value)}
                                className="text-sm text-gray-600"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Link href={`/recettes/${params.id}`}>
              <Button variant="outline">Annuler</Button>
            </Link>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700"
              disabled={updateRecipeMutation.isPending}
            >
              {updateRecipeMutation.isPending ? (
                'Modification...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Modifier la recette
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
      <AlertDialogComponent />
    </div>
  );
}