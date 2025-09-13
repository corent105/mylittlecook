'use client';

import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-bold text-slate-800">My Little Cook</span>
          </Link>
          <div className="flex items-center space-x-4">
            {session?.user ? (
              <Link href="/planning">
                <Button 
                  variant="outline" 
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  Mon planning
                </Button>
              </Link>
            ) : (
              <Button 
                variant="outline" 
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => signIn()}
              >
                Se connecter
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="grid lg:grid-cols-2 gap-16 items-center h-full">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 leading-tight">
                Planifiez vos repas
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
                  en toute simplicité
                </span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
                Organisez vos menus hebdomadaires, gérez vos recettes et générez automatiquement vos listes de courses.
              </p>
            </div>

            {/* Single CTA Button */}
            <div className="pt-4">
              {session?.user ? (
                <Link href="/planning">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Accéder à mon planning
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => signIn()}
                >
                  Commencer maintenant
                </Button>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex items-center space-x-6 text-sm text-slate-500 pt-8">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Gratuit</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Facile à utiliser</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Collaboratif</span>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="relative">
            <div className="relative">
              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/img/landing/cooking-planning.png"
                  alt="Interface de planning culinaire"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
              
              {/* Floating secondary image */}
              <div className="absolute -bottom-6 -right-6 w-48 h-32 rounded-xl overflow-hidden shadow-xl border-4 border-white">
                <Image
                  src="/img/landing/cooking-planning-focus.png"
                  alt="Détail du planning"
                  width={300}
                  height={200}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute top-1/4 -right-8 w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-30 animate-pulse delay-1000"></div>
          </div>
        </div>
      </main>

      {/* Footer - now a separate component */}
      <Footer />
    </div>
  );
}