import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => {
        // Keep at most 3 toasts
        const next = [...prev, { id, type, message }];
        if (next.length > 3) {
          return next.slice(next.length - 3);
        }
        return next;
      });

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);
  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, info, success, warning, error }}>
      {children}
      {/* Toast Overlay Stack */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const icon = {
            info: <Info className="w-4 h-4 text-[#2DD4BF] shrink-0" />,
            success: <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-[#F5C542] shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />,
          }[toast.type];

          const borderClass = {
            info: 'border-[#2DD4BF]/40',
            success: 'border-[#22C55E]/40',
            warning: 'border-[#F5C542]/40',
            error: 'border-[#EF4444]/40',
          }[toast.type];

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3 bg-[#12162B] border ${borderClass} rounded-lg shadow-xl text-xs font-mono text-slate-200 animate-fade-in`}
            >
              <div className="flex items-center gap-2.5">
                {icon}
                <span className="leading-snug">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
