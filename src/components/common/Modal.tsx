import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  isBlocking?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  children: React.ReactNode;
  ariaLabel?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  isBlocking = false,
  maxWidth = 'md',
  children,
  ariaLabel,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  // Store the active element before opening to restore focus on close
  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement;
    } else if (openerRef.current instanceof HTMLElement) {
      openerRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBlocking) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBlocking, onClose]);

  // Auto-focus first focusable element when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        focusable.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isBlocking) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || 'Dialog'}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthClasses} bg-[#12162B] border-2 border-[#232A47] rounded-xl shadow-2xl p-6 text-slate-100 relative`}
      >
        {/* Header if title exists */}
        {(title || !isBlocking) && (
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#232A47]">
            {title ? (
              <h2 className="font-pixel text-xs sm:text-sm text-[#F5C542] tracking-wider">
                {title}
              </h2>
            ) : (
              <div />
            )}
            {!isBlocking && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1A203C] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
