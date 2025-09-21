'use client';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChefHat, LogOut, User, Settings, Menu, Calendar, List, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  const { data: session, status } = useSession();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleLinkClick = () => {
    setIsPopoverOpen(false);
  };

  // Ne pas afficher le header sur la page d'accueil
  if (isHomePage) {
    return null;
  }
  const userInitials = session?.user?.name
    ? session.user.name.split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'U';
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-1 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 ">
          
          <img src="/logo_carotte.png" alt="Logo" className="size-24 " />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            <span className="hidden sm:inline">My Little Cook</span>  
            <span className="sm:hidden">MLC</span>
          </h1>
        </Link>
        
        {/* Desktop Navigation */}
        {session?.user && (
          <nav className="hidden md:flex space-x-6">
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
        )}

        {/* Mobile Navigation Menu - separate from user menu */}
        {session?.user && (
          <div className="md:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 z-[60]" align="end">
                <div className="space-y-1">
                  <Link href="/planning">
                    <Button variant="ghost" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      Planning
                    </Button>
                  </Link>
                  <Link href="/recettes">
                    <Button variant="ghost" className="w-full justify-start">
                      <ChefHat className="mr-2 h-4 w-4" />
                      Recettes
                    </Button>
                  </Link>
                  <Link href="/liste-de-courses">
                    <Button variant="ghost" className="w-full justify-start">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Liste de courses
                    </Button>
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {status === "loading" ? (
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"></div>
          ) : session?.user ? (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={session.user.image || undefined} 
                      alt={session.user.name || "User"} 
                    />
                    <AvatarFallback className="bg-orange-100 text-orange-700">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-[60]" align="end">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={session.user.image || undefined} 
                        alt={session.user.name || "User"} 
                      />
                      <AvatarFallback className="bg-orange-100 text-orange-700">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.user.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  
                  <hr />
                  <Link href="/parametres" onClick={handleLinkClick}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Paramètres
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleLinkClick();
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button onClick={() => signIn()}>Se connecter</Button>
          )}
        </div>
      </div>
    </header>
  );
}