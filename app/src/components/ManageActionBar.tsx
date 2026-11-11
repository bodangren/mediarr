import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ConfirmModal } from '@/components/ui/modal';
import { useToast } from '@/components/providers/ToastProvider';

/**
 * Shared movie/series management action bar.
 *
 * Every action runs through the same path: optional confirm dialog (which must name the exact
 * target), busy state, inline success line, and the server's error text verbatim. Pages own the
 * action list, so a page never renders a button whose route does not exist.
 */

export type ManageActionVariant = 'default' | 'primary' | 'destructive';

export interface ManageActionResult {
  message: string;
  detail?: string;
  /** Optional payload for page-specific follow-up UI (e.g. a sidecar-match preview). */
  payload?: unknown;
}

export interface ManageConfirm {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
}

export interface ManageAction {
  id: string;
  label: string;
  description?: string;
  variant?: ManageActionVariant;
  disabled?: boolean;
  confirm?: ManageConfirm;
  run: () => Promise<ManageActionResult | void>;
}

interface ManageActionBarProps {
  title?: string;
  description?: string;
  actions: ManageAction[];
  children?: ReactNode;
  onResult?: (actionId: string, result: ManageActionResult | void) => void;
  className?: string;
}

const VARIANT_CLASS: Record<ManageActionVariant, string> = {
  default: 'border-border-subtle bg-surface-2 text-text-primary hover:bg-surface-3',
  primary: 'border-accent bg-accent/10 text-accent hover:bg-accent/20',
  destructive: 'border-status-error/60 bg-transparent text-status-error hover:bg-status-error/10',
};

export function errorMessageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  const text = String(error);
  return text.trim().length > 0 ? text : 'Unknown error';
}

export function ManageActionBar({
  title = 'Manage',
  description,
  actions,
  children,
  onResult,
  className,
}: ManageActionBarProps) {
  const { pushToast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmActionId, setConfirmActionId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ action: ManageAction; result: ManageActionResult } | null>(null);
  const [lastError, setLastError] = useState<{ action: ManageAction; message: string } | null>(null);

  // Resolve the confirming action from the latest props so labels/descriptions that depend on
  // page state (e.g. "delete files" checkbox) stay live while the dialog is open.
  const confirmAction = useMemo(
    () => actions.find((action) => action.id === confirmActionId) ?? null,
    [actions, confirmActionId],
  );

  const execute = useCallback(async (action: ManageAction) => {
    setPendingId(action.id);
    setLastError(null);
    try {
      const result = await action.run();
      if (result && result.message) {
        setLastResult({ action, result });
        pushToast({ title: action.label, message: result.message, variant: 'success' });
      } else {
        setLastResult(null);
      }
      onResult?.(action.id, result);
    } catch (error) {
      const message = errorMessageOf(error);
      setLastError({ action, message });
      pushToast({ title: `${action.label} failed`, message, variant: 'error' });
    } finally {
      setPendingId(null);
    }
  }, [onResult, pushToast]);

  const request = useCallback((action: ManageAction) => {
    if (action.disabled || pendingId) return;
    if (action.confirm) {
      setConfirmActionId(action.id);
      return;
    }
    void execute(action);
  }, [execute, pendingId]);

  const confirming = pendingId !== null && pendingId === confirmActionId;

  return (
    <section
      aria-label={title}
      className={cn('space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4', className)}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description ? <p className="text-xs text-text-secondary">{description}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            title={action.description}
            aria-label={action.label}
            className={cn(
              'rounded-sm border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              VARIANT_CLASS[action.variant ?? 'default'],
            )}
            disabled={action.disabled || pendingId !== null}
            onClick={() => request(action)}
          >
            {pendingId === action.id ? 'Working...' : action.label}
          </button>
        ))}
      </div>

      {lastError ? (
        <p role="alert" className="break-words rounded-sm border border-status-error/40 bg-status-error/10 px-2 py-1.5 text-xs text-status-error">
          {lastError.action.label} failed: {lastError.message}
        </p>
      ) : null}

      {lastResult ? (
        <div role="status" className="space-y-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-xs text-text-secondary">
          <p className="text-text-primary">{lastResult.result.message}</p>
          {lastResult.result.detail ? (
            <p className="whitespace-pre-wrap break-words font-mono">{lastResult.result.detail}</p>
          ) : null}
        </div>
      ) : null}

      {children}

      {confirmAction ? (
        <ConfirmModal
          isOpen
          title={confirmAction.confirm?.title ?? confirmAction.label}
          description={confirmAction.confirm?.description}
          onCancel={() => setConfirmActionId(null)}
          onConfirm={() => {
            const action = confirmAction;
            setConfirmActionId(null);
            if (action) void execute(action);
          }}
          cancelLabel="Cancel"
          confirmLabel={confirmAction.confirm?.confirmLabel ?? confirmAction.label}
          confirmVariant={confirmAction.variant === 'destructive' ? 'destructive' : 'default'}
          isConfirming={confirming}
        />
      ) : null}
    </section>
  );
}
