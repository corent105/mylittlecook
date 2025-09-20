'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw } from "lucide-react";

interface UrlExtractorProps {
  onExtract: (url: string) => Promise<void>;
  isLoading: boolean;
}

export default function UrlExtractor({ onExtract, isLoading }: UrlExtractorProps) {
  const [url, setUrl] = useState('');

  const handleExtract = async () => {
    if (!url.trim()) return;
    await onExtract(url.trim());
  };

  return (
    <Card className="p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">Entrez l'URL de la recette</h3>
      <div className="flex space-x-4">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.example.com/recette-delicieuse"
          className="flex-1"
          disabled={isLoading}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && url.trim() && !isLoading) {
              handleExtract();
            }
          }}
        />
        <Button
          onClick={handleExtract}
          disabled={isLoading || !url.trim()}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Extraction...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Extraire
            </>
          )}
        </Button>
      </div>
      <p className="text-sm text-gray-600 mt-3">
        Entrez l'URL d'un site de recettes pour extraire automatiquement les informations
      </p>
    </Card>
  );
}