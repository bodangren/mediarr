import { Badge } from '@/components/ui/badge';

export type HealthStateVariant = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface IndexerHealthSnapshot {
  indexerId: number;
  failureCount: number;
  lastErrorMessage: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

export interface HealthState {
  variant: HealthStateVariant;
  label: string;
  description: string;
}

export function computeHealthState(
  snapshot: IndexerHealthSnapshot | null,
  autoDisableThreshold: number,
): HealthState {
  if (!snapshot) {
    return {
      variant: 'unknown',
      label: 'Unknown',
      description: 'No health snapshot recorded yet.',
    };
  }

  const { failureCount, lastErrorMessage } = snapshot;

  if (autoDisableThreshold > 0 && failureCount >= autoDisableThreshold) {
    return {
      variant: 'critical',
      label: `Critical (${failureCount}/${autoDisableThreshold})`,
      description:
        lastErrorMessage
          ? `Critical — last error: ${lastErrorMessage}`
          : `Critical — ${failureCount} consecutive failures at threshold ${autoDisableThreshold}.`,
    };
  }

  if (failureCount > 0) {
    return {
      variant: 'warning',
      label: `Warning (${failureCount}/${autoDisableThreshold})`,
      description:
        lastErrorMessage
          ? `Warning (${failureCount}/${autoDisableThreshold}) — last error: ${lastErrorMessage}`
          : `Warning (${failureCount}/${autoDisableThreshold}) — ${failureCount} consecutive failure(s).`,
    };
  }

  return {
    variant: 'healthy',
    label: 'Healthy',
    description: 'Healthy — no recent failures.',
  };
}

export interface IndexerHealthBadgeProps {
  snapshot: IndexerHealthSnapshot | null;
  autoDisableThreshold: number;
}

const VARIANT_TO_BADGE: Record<HealthStateVariant, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  healthy: 'default',
  warning: 'outline',
  critical: 'destructive',
  unknown: 'secondary',
};

const VARIANT_TO_CLASS: Record<HealthStateVariant, string> = {
  healthy: 'border-status-success/40 text-status-success',
  warning: 'border-status-warning/40 text-status-warning',
  critical: 'border-status-error text-status-error',
  unknown: 'border-border-subtle text-text-secondary',
};

export function IndexerHealthBadge({ snapshot, autoDisableThreshold }: IndexerHealthBadgeProps) {
  const state = computeHealthState(snapshot, autoDisableThreshold);

  return (
    <Badge
      data-testid="indexer-health-badge"
      data-variant={state.variant}
      variant={VARIANT_TO_BADGE[state.variant]}
      aria-label={state.description}
      className={VARIANT_TO_CLASS[state.variant]}
    >
      {state.label}
    </Badge>
  );
}