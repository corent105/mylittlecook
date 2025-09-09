import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, ChefHat, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Planifiez vos repas en famille
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Créez des plannings de repas collaboratifs, gérez vos recettes en Markdown 
            et générez automatiquement vos listes de courses. Simplifiez votre quotidien culinaire.
          </p>
          <div className="space-x-4">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
              Commencer gratuitement
            </Button>
            <Button size="lg" variant="outline">
              Voir la démo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Calendar className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Planning hebdomadaire</h3>
            <p className="text-gray-600 text-sm">
              Organisez vos repas sur une grille intuitive jour par jour
            </p>
          </Card>
          
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <ChefHat className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Recettes Markdown</h3>
            <p className="text-gray-600 text-sm">
              Créez et éditez vos recettes avec un éditeur Markdown intégré
            </p>
          </Card>
          
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Users className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Collaboration</h3>
            <p className="text-gray-600 text-sm">
              Partagez vos plannings avec la famille et les amis
            </p>
          </Card>
          
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <ShoppingCart className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Liste de courses</h3>
            <p className="text-gray-600 text-sm">
              Génération automatique des listes consolidées
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl p-12 shadow-lg">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Prêt à simplifier votre organisation culinaire ?
          </h3>
          <p className="text-gray-600 mb-8">
            Rejoignez des milliers de familles qui ont déjà adopté My Little Cook
          </p>
          <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
            Créer mon premier planning
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <ChefHat className="h-6 w-6 text-orange-600" />
              <span className="font-semibold text-gray-900">My Little Cook</span>
            </div>
            <p className="text-gray-600 text-sm">
              © 2024 My Little Cook. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}