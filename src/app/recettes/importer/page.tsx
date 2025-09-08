'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, ArrowLeft, Download, Save, RefreshCw, ExternalLink, Eye, Edit3, Trash2, Plus } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import type { ExtractedRecipe } from '@/lib/recipe-extractor';

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
  sourceUrl: string;
}

export default function ImportRecipePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editableIngredients, setEditableIngredients] = useState<Array<{
    id: string;
    quantity: number;
    unit: string;
    name: string;
    notes?: string;
    category?: string;
  }>>([]);
  const [form, setForm] = useState<RecipeForm>({
    title: '',
    description: '',
    content: '',
    imageUrl: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    sourceUrl: '',
  });

  // Extract recipe from URL
  const extractMutation = api.recipeImport.extractFromUrl.useMutation({
    onSuccess: (data: ExtractedRecipe) => {
      setExtractedRecipe(data);
      setForm({
        title: data.title,
        description: data.description || '',
        content: data.markdown,
        imageUrl: data.imageUrl || '',
        prepTime: data.prepTime?.toString() || '',
        cookTime: data.cookTime?.toString() || '',
        servings: data.servings?.toString() || '',
        sourceUrl: data.sourceUrl,
      });
      
      // Set editable ingredients with unique IDs
      setEditableIngredients(
        data.parsedIngredients.map((ingredient, index) => ({
          id: `ingredient-${index}`,
          ...ingredient,
        }))
      );
    },
    onError: (error) => {
      console.error('Extraction error:', error);
      alert(`Erreur d'extraction: ${error.message}`);
    },
  });

  // Create recipe from extracted data
  const createRecipeMutation = api.recipeImport.createFromExtracted.useMutation({
    onSuccess: (data) => {
      router.push(`/recettes/${data.id}`);
    },
    onError: (error) => {
      console.error('Creation error:', error);
      alert(`Erreur de création: ${error.message}`);
    },
  });

  const handleExtract = async () => {
    if (!url.trim()) {
      alert('Veuillez entrer une URL');
      return;
    }

    try {
      await extractMutation.mutateAsync({ url: url.trim() });
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  const handleSaveRecipe = async () => {
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
        sourceUrl: form.sourceUrl,
        parsedIngredients: editableIngredients.filter(ing => ing.name.trim() !== ''),
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
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900">My Little Cook</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="/">
              <Button variant="ghost">Accueil</Button>
            </Link>
            <Link href="/planning">
              <Button variant="ghost">Planning</Button>
            </Link>
            <Link href="/recettes">
              <Button variant="ghost">Recettes</Button>
            </Link>
            <Button variant="ghost">Liste de courses</Button>
          </nav>
          <Button>Mon compte</Button>
        </div>
      </header>

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
              <h2 className="text-3xl font-bold text-gray-900">Importer une Recette</h2>
              <p className="text-gray-600">Importez une recette depuis une URL et personnalisez-la</p>
            </div>
          </div>
        </div>

        {/* URL Input Section */}
        {!extractedRecipe && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Entrez l'URL de la recette</h3>
            <div className="flex space-x-4">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com/recette-delicieuse"
                className="flex-1"
                disabled={extractMutation.isPending}
              />
              <Button
                onClick={handleExtract}
                disabled={extractMutation.isPending || !url.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {extractMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Extraction...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Extraire la recette
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Nous supportons la plupart des sites de recettes populaires. L'extraction peut prendre quelques secondes.
            </p>
          </Card>
        )}

        {/* Recipe Editor Section */}
        {extractedRecipe && (
          <div className="space-y-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Original Site Preview */}
              <div>
                <Card className="h-full">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Site Original</h3>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(extractedRecipe.sourceUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ouvrir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? (
                          <>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Éditer
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Aperçu
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="p-0">
                    {/* Simple iframe for website preview */}
                    <iframe
                      src={extractedRecipe.sourceUrl}
                      className="w-full h-96 border-0"
                      title="Aperçu de la recette originale"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </Card>
              </div>

              {/* Right Column - Recipe Info */}
              <div>
                <Card className="p-6 h-full">
                  <h3 className="text-lg font-semibold mb-4">Informations de la recette</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Titre de la recette *
                      </label>
                      <Input
                        value={form.title}
                        onChange={(e) => updateForm('title', e.target.value)}
                        placeholder="Titre de la recette"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description courte
                      </label>
                      <Input
                        value={form.description}
                        onChange={(e) => updateForm('description', e.target.value)}
                        placeholder="Description de la recette"
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

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Préparation (min)
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
                          Cuisson (min)
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
                          Personnes
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

                    {/* Extraction Summary */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Résumé de l'extraction</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>✅ Titre: {extractedRecipe.title}</div>
                        <div>✅ Ingrédients: {extractedRecipe.ingredients?.length || 0} trouvés</div>
                        <div>✅ Étapes: {extractedRecipe.instructions?.length || 0} trouvées</div>
                        {extractedRecipe.prepTime && <div>✅ Temps de préparation: {extractedRecipe.prepTime} min</div>}
                        {extractedRecipe.servings && <div>✅ Portions: {extractedRecipe.servings} personnes</div>}
                        {extractedRecipe.imageUrl && <div>✅ Image trouvée</div>}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Ingredients Management Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Ingrédients</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newIngredient = {
                      id: `ingredient-${editableIngredients.length}`,
                      quantity: 1,
                      unit: 'pièce',
                      name: '',
                      notes: '',
                      category: 'autres'
                    };
                    setEditableIngredients([...editableIngredients, newIngredient]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un ingrédient
                </Button>
              </div>

              <div className="space-y-3">
                {editableIngredients.map((ingredient, index) => (
                  <div key={ingredient.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={ingredient.quantity}
                        onChange={(e) => {
                          const updated = editableIngredients.map((ing, idx) => 
                            idx === index ? { ...ing, quantity: parseFloat(e.target.value) || 0 } : ing
                          );
                          setEditableIngredients(updated);
                        }}
                        placeholder="Qté"
                        step="0.1"
                        min="0"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={ingredient.unit}
                        onChange={(e) => {
                          const updated = editableIngredients.map((ing, idx) => 
                            idx === index ? { ...ing, unit: e.target.value } : ing
                          );
                          setEditableIngredients(updated);
                        }}
                        placeholder="Unité"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        value={ingredient.name}
                        onChange={(e) => {
                          const updated = editableIngredients.map((ing, idx) => 
                            idx === index ? { ...ing, name: e.target.value } : ing
                          );
                          setEditableIngredients(updated);
                        }}
                        placeholder="Nom de l'ingrédient"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={ingredient.notes || ''}
                        onChange={(e) => {
                          const updated = editableIngredients.map((ing, idx) => 
                            idx === index ? { ...ing, notes: e.target.value } : ing
                          );
                          setEditableIngredients(updated);
                        }}
                        placeholder="Notes (optionnel)"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = editableIngredients.filter((_, idx) => idx !== index);
                          setEditableIngredients(updated);
                        }}
                        className="p-2"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}

                {editableIngredients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucun ingrédient détecté. Vous pouvez en ajouter manuellement.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Markdown Editor Section */}
        {extractedRecipe && (
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Contenu de la recette (Markdown)</h3>
              <div className="text-sm text-gray-600">
                Modifiez le contenu généré automatiquement
              </div>
            </div>
            
            {showPreview ? (
              <div className="prose max-w-none bg-white p-6 border rounded-lg">
                <div dangerouslySetInnerHTML={{ __html: form.content }} />
              </div>
            ) : (
              <div className="prose-container">
                <MDEditor
                  value={form.content}
                  onChange={(val) => updateForm('content', val || '')}
                  height={500}
                  preview="edit"
                  data-color-mode="light"
                />
              </div>
            )}
          </Card>
        )}

        {/* Action Buttons */}
        {extractedRecipe && (
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setExtractedRecipe(null);
                setEditableIngredients([]);
                setForm({
                  title: '',
                  description: '',
                  content: '',
                  imageUrl: '',
                  prepTime: '',
                  cookTime: '',
                  servings: '',
                  sourceUrl: '',
                });
              }}
            >
              Recommencer
            </Button>
            <Button
              onClick={handleSaveRecipe}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={createRecipeMutation.isPending}
            >
              {createRecipeMutation.isPending ? (
                'Sauvegarde...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder la recette
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}