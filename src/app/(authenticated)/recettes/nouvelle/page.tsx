'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, Save, ArrowLeft, Download } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

// Import MDEditor dynamically to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface RecipeForm {
  title: string;
  description: string;
  content: string;
  imageUrl: string;
  prepTime: string;
  cookTime: string;
  servings: string;
}

export default function NewRecipePage() {
  const router = useRouter();
  const [form, setForm] = useState<RecipeForm>({
    title: '',
    description: '',
    content: `# Ma Nouvelle Recette

## Ingrédients

- [ ] Ingrédient 1 (quantité)
- [ ] Ingrédient 2 (quantité)
- [ ] Ingrédient 3 (quantité)

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

    try {
      await createRecipeMutation.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        content: form.content,
        imageUrl: form.imageUrl || undefined,
        prepTime: form.prepTime ? parseInt(form.prepTime) : undefined,
        cookTime: form.cookTime ? parseInt(form.cookTime) : undefined,
        servings: form.servings ? parseInt(form.servings) : undefined,
      });
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  const updateForm = (field: keyof RecipeForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
          <Link href="/src/app/(authenticated)/recettes/importer">
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