import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
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
          <Link href="/liste-de-courses">
            <Button variant="ghost">Liste de courses</Button>
          </Link>
        </nav>
        <Button>Mon compte</Button>
      </div>
    </header>
  );
}