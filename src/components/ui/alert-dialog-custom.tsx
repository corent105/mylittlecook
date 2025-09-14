'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type?: AlertType;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-orange-600',
  info: 'text-blue-600',
};

export function AlertDialog({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  confirmText = 'OK',
  onConfirm,
  cancelText = 'Annuler',
}: AlertDialogProps) {
  const Icon = iconMap[type];

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${colorMap[type]}`} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onConfirm && (
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            className={`w-full sm:w-auto ${
              type === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'success'
                ? 'bg-green-600 hover:bg-green-700'
                : type === 'warning'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook pour utiliser facilement les dialogs d'alerte
export function useAlertDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: AlertType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info',
  });

  const showAlert = (
    title: string,
    description: string,
    type: AlertType = 'info',
    options?: {
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void;
    }
  ) => {
    setDialog({
      isOpen: true,
      title,
      description,
      type,
      ...options,
    });
  };

  const closeDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const AlertDialogComponent = () => (
    <AlertDialog
      isOpen={dialog.isOpen}
      onClose={closeDialog}
      title={dialog.title}
      description={dialog.description}
      type={dialog.type}
      confirmText={dialog.confirmText}
      cancelText={dialog.cancelText}
      onConfirm={dialog.onConfirm}
    />
  );

  return {
    showAlert,
    closeDialog,
    AlertDialogComponent,
  };
}