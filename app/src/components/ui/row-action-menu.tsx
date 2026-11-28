import type { ReactNode } from 'react';

/**
 * Lightweight context menu for row/header actions.
 *
 * Uses a native `<details>` element so D-pad/TV and keyboard focus behave like any other control and
 * jsdom can drive it with a plain click on the summary (no Radix pointer plumbing required).
 */
export function RowActionMenu(props: {
  /** Accessible name of the trigger, e.g. "Season 2 actions". */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`relative inline-block ${props.className ?? ''}`}>
      <summary
        aria-label={props.label}
        className="cursor-pointer select-none list-none rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-surface-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary [&::-webkit-details-marker]:hidden"
      >
        ⋯
      </summary>
      <div
        role="menu"
        className="absolute right-0 z-20 mt-1 flex min-w-44 flex-col gap-1 rounded-md border border-border-subtle bg-surface-1 p-1 shadow-elevation-2"
      >
        {props.children}
      </div>
    </details>
  );
}

export function RowActionMenuItem(props: {
  children: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={props.disabled}
      onClick={props.onSelect}
      className={`rounded-sm px-2 py-1 text-left text-xs hover:bg-surface-2 disabled:opacity-50 ${
        props.variant === 'primary' ? 'text-accent-primary' : 'text-text-primary'
      }`}
    >
      {props.children}
    </button>
  );
}
