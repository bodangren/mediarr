
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  title?: string;
  message?: string;
  variant?: ToastVariant;
  action?: ToastAction;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  pushToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function variantClass(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return 'border-status-completed/40 bg-status-completed/15';
    case 'warning':
      return 'border-accent-warning/40 bg-accent-warning/15';
    case 'error':
      return 'border-status-error/40 bg-status-error/15';
    default:
      return 'border-accent-info/30 bg-accent-info/12';
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const next = {
      ...toast,
      variant: toast.variant ?? 'info',
      id,
    } satisfies ToastItem;

    setToasts(current => [...current, next]);

    setTimeout(() => {
      setToasts(current => current.filter(item => item.id !== id));
    }, 4500);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(420px,92vw)] flex-col gap-2">
        {toasts.map(toast => {
          const variant = toast.variant ?? 'info';
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-md border px-4 py-3 shadow-elevation-2 backdrop-blur ${variantClass(variant)}`}
              role="status"
            >
              {toast.title ? <p className="text-sm font-semibold text-text-primary">{toast.title}</p> : null}
              {toast.message ? <p className="mt-1 text-sm text-text-secondary">{toast.message}</p> : null}
              {toast.action ? (
                <button
                  type="button"
                  className="mt-2 rounded-sm border border-border-subtle px-2 py-1 text-xs font-medium text-text-primary hover:bg-surface-2"
                  onClick={toast.action.onClick}
                >
                  {toast.action.label}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
