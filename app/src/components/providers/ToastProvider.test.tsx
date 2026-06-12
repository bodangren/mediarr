import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './ToastProvider';

function ToastConsumer({
  payload,
  label = 'fire',
}: {
  payload: Parameters<ReturnType<typeof useToast>['pushToast']>[0];
  label?: string;
}) {
  const { pushToast } = useToast();
  return (
    <button type="button" onClick={() => pushToast(payload)}>
      {label}
    </button>
  );
}

function ToastProbe() {
  const { pushToast } = useToast();
  // Expose pushToast so the auto-dismiss test can drive it under fake timers
  // without depending on user-event's interaction queue.
  // eslint-disable-next-line react-hooks/immutability
  (globalThis as { __pushToast?: typeof pushToast }).__pushToast = pushToast;
  return null;
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(
      <ToastProvider>
        <p>child-content</p>
      </ToastProvider>,
    );

    expect(screen.getByText('child-content')).toBeInTheDocument();
  });

  it('displays toast with title, message, and variant class when triggered via context', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastConsumer
          payload={{ title: 'Hello', message: 'World', variant: 'success' }}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'fire' }));

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('Hello');
    expect(toast).toHaveTextContent('World');
    expect(toast).toHaveClass(/border-status-completed/);
  });

  it('auto-dismisses toast after the 4500ms timeout', () => {
    // Drive the pushToast under fake timers directly via a probe component
    // to avoid the user-event + fake-timer interaction queue, which can
    // hang in JSDOM under vitest 4 with concurrent timer sources.
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    const push = (globalThis as { __pushToast?: (t: { title: string; variant: 'info' | 'success' | 'warning' | 'error' }) => void }).__pushToast;
    expect(push).toBeTypeOf('function');

    act(() => {
      push!({ title: 'ephemeral', variant: 'info' });
    });

    expect(screen.getByRole('status')).toHaveTextContent('ephemeral');

    // Advance past the 4500ms auto-dismiss threshold the provider schedules.
    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('throws when useToast is consumed outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BareConsumer() {
      useToast();
      return null;
    }

    expect(() => render(<BareConsumer />)).toThrow(/must be used within ToastProvider/);

    consoleError.mockRestore();
  });

  it('renders an action button when a toast is pushed with an action and invokes onClick', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastConsumer
          payload={{
            title: 'Update available',
            variant: 'info',
            action: { label: 'Refresh now', onClick: onAction },
          }}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'fire' }));

    const actionButton = await screen.findByRole('button', { name: 'Refresh now' });
    expect(actionButton).toBeInTheDocument();

    await user.click(actionButton);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
