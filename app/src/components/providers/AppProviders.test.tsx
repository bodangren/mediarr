import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { AppProviders } from './AppProviders';
import { useToast } from './ToastProvider';

// Shallow-mock the events cache bridge so the test focuses on context
// provisioning. The real bridge subscribes to a global EventSource and
// would otherwise require a mocked `getApiClients()` + query client state.
vi.mock('@/lib/events/useEventsCacheBridge', () => ({
  useEventsCacheBridge: vi.fn(),
}));

function ContextProbe({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  // The two contexts must be present, not undefined, and the QueryClient
  // instance must be a real React-Query client (has .invalidateQueries).
  if (!queryClient || typeof queryClient.invalidateQueries !== 'function') {
    return <span data-testid={`${id}-missing-qc`}>missing-query-client</span>;
  }

  if (!toast || typeof toast.pushToast !== 'function') {
    return <span data-testid={`${id}-missing-toast`}>missing-toast</span>;
  }

  return <span data-testid={id}>probe-ok</span>;
}

describe('AppProviders', () => {
  it('renders children without errors', () => {
    render(
      <AppProviders>
        <p>child-content</p>
      </AppProviders>,
    );

    expect(screen.getByText('child-content')).toBeInTheDocument();
  });

  it('provides QueryClient context (children can call useQueryClient)', () => {
    render(
      <AppProviders>
        <ContextProbe id="qc" />
      </AppProviders>,
    );

    const probe = screen.getByTestId('qc');
    expect(probe).toBeInTheDocument();
    expect(probe).toHaveTextContent('probe-ok');
  });

  it('provides Toast context (children can call useToast)', () => {
    render(
      <AppProviders>
        <ContextProbe id="toast" />
      </AppProviders>,
    );

    const probe = screen.getByTestId('toast');
    expect(probe).toBeInTheDocument();
    expect(probe).toHaveTextContent('probe-ok');
  });

  it('renders multiple children as siblings under the provider tree', () => {
    render(
      <AppProviders>
        <span>first</span>
        <span>second</span>
        <span>third</span>
      </AppProviders>,
    );

    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getByText('third')).toBeInTheDocument();
  });
});
