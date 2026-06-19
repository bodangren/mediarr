import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IndexerHealthBadge, computeHealthState } from './IndexerHealthBadge';
import type { IndexerHealthSnapshot } from './IndexerHealthBadge';

function makeSnapshot(overrides: Partial<IndexerHealthSnapshot> = {}): IndexerHealthSnapshot {
  return {
    indexerId: 1,
    failureCount: 0,
    lastErrorMessage: null,
    lastSuccessAt: '2026-06-19T00:00:00.000Z',
    lastFailureAt: null,
    ...overrides,
  };
}

describe('computeHealthState', () => {
  it('returns unknown when snapshot is null', () => {
    expect(computeHealthState(null, 3)).toMatchObject({ variant: 'unknown', label: 'Unknown' });
  });

  it('returns healthy at zero failures', () => {
    expect(computeHealthState(makeSnapshot({ failureCount: 0 }), 3).variant).toBe('healthy');
  });

  it('returns warning below threshold', () => {
    const state = computeHealthState(makeSnapshot({ failureCount: 1 }), 3);
    expect(state.variant).toBe('warning');
    expect(state.label).toContain('1');
  });

  it('returns critical at threshold', () => {
    const state = computeHealthState(makeSnapshot({ failureCount: 3 }), 3);
    expect(state.variant).toBe('critical');
    expect(state.label.toLowerCase()).toContain('critical');
  });

  it('returns critical above threshold', () => {
    const state = computeHealthState(makeSnapshot({ failureCount: 7 }), 3);
    expect(state.variant).toBe('critical');
  });

  it('returns healthy for threshold zero (auto-disable sentinel) when no failures', () => {
    expect(computeHealthState(makeSnapshot({ failureCount: 0 }), 0).variant).toBe('healthy');
  });

  it('includes failure count in label', () => {
    const state = computeHealthState(makeSnapshot({ failureCount: 5 }), 3);
    expect(state.label).toContain('5');
  });
});

describe('IndexerHealthBadge', () => {
  it('renders critical badge at threshold', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ failureCount: 3, lastErrorMessage: 'HTTP timeout' })}
          autoDisableThreshold={3}
        />
      </TooltipProvider>,
    );
    const badge = screen.getByTestId('indexer-health-badge');
    expect(badge.dataset.variant).toBe('critical');
    expect(badge.textContent?.toLowerCase()).toContain('critical');
  });

  it('renders warning badge below threshold', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ failureCount: 1 })}
          autoDisableThreshold={3}
        />
      </TooltipProvider>,
    );
    const badge = screen.getByTestId('indexer-health-badge');
    expect(badge.dataset.variant).toBe('warning');
  });

  it('renders healthy badge at zero failures', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ failureCount: 0 })}
          autoDisableThreshold={3}
        />
      </TooltipProvider>,
    );
    const badge = screen.getByTestId('indexer-health-badge');
    expect(badge.dataset.variant).toBe('healthy');
  });

  it('renders unknown when snapshot is null', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge snapshot={null} autoDisableThreshold={3} />
      </TooltipProvider>,
    );
    const badge = screen.getByTestId('indexer-health-badge');
    expect(badge.dataset.variant).toBe('unknown');
  });

  it('exposes last error message via aria-label for tooltip', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({
            failureCount: 2,
            lastErrorMessage: 'Connection refused',
          })}
          autoDisableThreshold={3}
        />
      </TooltipProvider>,
    );
    const badge = screen.getByTestId('indexer-health-badge');
    expect(badge.getAttribute('aria-label')).toContain('Connection refused');
  });

  it('exposes threshold and failure count in aria-label when no error message', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ failureCount: 1 })}
          autoDisableThreshold={3}
        />
      </TooltipProvider>,
    );
    const badge = screen.getByTestId('indexer-health-badge');
    expect(badge.getAttribute('aria-label')).toContain('1');
    expect(badge.getAttribute('aria-label')).toContain('3');
  });
});

describe('IndexerHealthBadge re-enable action', () => {
  it('re-enable button is shown when health is critical', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ indexerId: 7, failureCount: 3, lastErrorMessage: 'HTTP timeout' })}
          autoDisableThreshold={3}
          onReenable={() => {}}
        />
      </TooltipProvider>,
    );
    const reenableButton = screen.getByTestId('indexer-health-reenable');
    expect(reenableButton).toBeInTheDocument();
    expect(reenableButton.getAttribute('data-indexer-id')).toBe('7');
  });

  it('re-enable button is not shown when health is warning', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ failureCount: 1 })}
          autoDisableThreshold={3}
          onReenable={() => {}}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByTestId('indexer-health-reenable')).not.toBeInTheDocument();
  });

  it('re-enable button is not shown when health is healthy', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ failureCount: 0 })}
          autoDisableThreshold={3}
          onReenable={() => {}}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByTestId('indexer-health-reenable')).not.toBeInTheDocument();
  });

  it('re-enable button is not shown when snapshot is null', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={null}
          autoDisableThreshold={3}
          onReenable={() => {}}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByTestId('indexer-health-reenable')).not.toBeInTheDocument();
  });

  it('calls onReenable with indexerId when re-enable button is clicked', () => {
    const onReenable = vi.fn();
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ indexerId: 42, failureCount: 5, lastErrorMessage: 'timeout' })}
          autoDisableThreshold={3}
          onReenable={onReenable}
        />
      </TooltipProvider>,
    );
    const reenableButton = screen.getByTestId('indexer-health-reenable');
    fireEvent.click(reenableButton);
    expect(onReenable).toHaveBeenCalledTimes(1);
    expect(onReenable).toHaveBeenCalledWith(42);
  });
});

describe('IndexerHealthBadge tooltip', () => {
  it('wraps the badge in a tooltip trigger with health history description', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({
            indexerId: 7,
            failureCount: 2,
            lastErrorMessage: 'Connection refused',
            lastSuccessAt: '2026-06-18T12:00:00.000Z',
            lastFailureAt: '2026-06-19T03:00:00.000Z',
          })}
          autoDisableThreshold={3}
        />
      </TooltipProvider>,
    );
    const trigger = screen.getByTestId('indexer-health-tooltip-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain('Connection refused');
    expect(trigger.textContent).toContain('2');
    expect(trigger.textContent).toContain('3');
  });

  it('tooltip trigger exposes the indexer id so history is keyed per-indexer', () => {
    render(
      <TooltipProvider>
        <IndexerHealthBadge
          snapshot={makeSnapshot({ indexerId: 99, failureCount: 0 })}
          autoDisableThreshold={3}
        />
      </TooltipProvider>,
    );
    const trigger = screen.getByTestId('indexer-health-tooltip-trigger');
    expect(trigger.getAttribute('data-indexer-id')).toBe('99');
  });
});