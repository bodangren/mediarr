/* eslint-disable react-refresh/only-export-components */
import { useCallback, useState, type ReactNode } from 'react';
import { ConfirmModal } from '@/components/ui/modal';

/** Inline action result. `error` always carries the server's message verbatim. */
export interface Feedback {
  kind: 'success' | 'error';
  text: string;
}

export type FeedbackMap = Record<string, Feedback | undefined>;

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return 'size unknown';
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatAge(iso: string | null | undefined): string {
  if (!iso) return 'age unknown';
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return 'age unknown';
  const hours = Math.max(0, Math.floor((Date.now() - at) / (60 * 60 * 1000)));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : at.toLocaleString();
}

export function FeedbackLine({ feedback, className = '' }: { feedback?: Feedback | null; className?: string }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.kind === 'error' ? 'alert' : 'status'}
      className={`text-xs ${feedback.kind === 'error' ? 'text-accent-danger' : 'text-accent-success'} ${className}`}
    >
      {feedback.text}
    </p>
  );
}

export interface ConfirmRequest {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  run: () => Promise<void>;
}

/**
 * Destructive-action confirm shared by the YouTube panels: every request names its exact target, and
 * the dialog closes only after the action settles so a failure can be reported inline.
 */
export function useConfirmAction() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const confirm = useCallback((next: ConfirmRequest) => setRequest(next), []);

  const dialog = (
    <ConfirmModal
      isOpen={request !== null}
      title={request?.title ?? ''}
      description={request?.description}
      confirmLabel={request?.confirmLabel ?? 'Delete'}
      isConfirming={isConfirming}
      onCancel={() => {
        if (!isConfirming) setRequest(null);
      }}
      onConfirm={() => {
        if (!request) return;
        setIsConfirming(true);
        void request.run()
          .catch(() => undefined)
          .finally(() => {
            setIsConfirming(false);
            setRequest(null);
          });
      }}
    />
  );

  return { confirm, dialog, isConfirming };
}

/** Per-action feedback keyed by row/section so one failure never hides another. */
export function useFeedbackMap() {
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const show = useCallback((key: string, value: Feedback | null) => {
    setFeedback((previous) => ({ ...previous, [key]: value ?? undefined }));
  }, []);
  return { feedback, show };
}
