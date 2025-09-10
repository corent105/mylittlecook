import { ChefHat } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <ChefHat className="h-6 w-6 text-slate-600" />
            <span className="font-semibold text-slate-700">My Little Cook</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2024 My Little Cook. Fait avec ❤️ pour simplifier votre quotidien.
          </p>
        </div>
      </div>
    </footer>
  );
}