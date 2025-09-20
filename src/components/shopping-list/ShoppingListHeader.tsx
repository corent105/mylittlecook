'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Share2, Download } from "lucide-react";
import Link from "next/link";

interface ShoppingListHeaderProps {
  formatDateRange: () => string;
  onShare: () => void;
  onExport: () => void;
}

export default function ShoppingListHeader({
  formatDateRange,
  onShare,
  onExport
}: ShoppingListHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      {/* Mobile Layout */}
      <div className="md:hidden space-y-4">
        {/* Back Button */}
        <Link href="/planning">
          <Button variant="outline" size="sm" className="mb-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au planning
          </Button>
        </Link>

        {/* Title and Date */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Liste de Courses</h2>
          <div className="flex items-center justify-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="text-sm">{formatDateRange()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onShare} className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
          <Button variant="outline" onClick={onExport} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/planning">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au planning
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Liste de Courses</h2>
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{formatDateRange()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </div>
    </div>
  );
}