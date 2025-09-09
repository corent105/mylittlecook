'use client';

import { signIn, getProviders } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  const [providers, setProviders] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await getProviders();
      setProviders(res);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
            <ChefHat className="h-10 w-10 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">My Little Cook</h1>
          </Link>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Bienvenue !
          </h2>
          <p className="text-gray-600">
            Connectez-vous pour gérer vos recettes et plannings de repas
          </p>
        </div>

        <div className="space-y-4">
          {providers &&
            Object.values(providers).map((provider: any) => (
              <Button
                key={provider.name}
                onClick={() => signIn(provider.id, { callbackUrl: "/" })}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg"
                size="lg"
              >
                Se connecter avec {provider.name}
              </Button>
            ))}
        </div>

        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Continuer sans connexion (mode démo)
          </Link>
        </div>
      </Card>
    </div>
  );
}