import React from 'react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';
import { AlertTriangle, Info } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="sm">
      <div className="flex items-start gap-3 mb-6">
        <div
          className={`p-2 rounded-lg ${
            variant === 'danger'
              ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
              : 'bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30'
          }`}
        >
          {variant === 'danger' ? (
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          ) : (
            <Info className="w-5 h-5 shrink-0" aria-hidden="true" />
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-0.5">
          {message}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
