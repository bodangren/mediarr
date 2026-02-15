import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthCheck } from './HealthCheck';

describe('HealthCheck', () => {
  it('should render health check with ok status', () => {
    const check = {
      type: 'Indexer Proxy',
      source: 'System',
      message: 'All indexer proxies are healthy',
      status: 'ok' as const,
      lastChecked: '2026-02-15T04:13:00Z',
    };

    render(<HealthCheck check={check} />);

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Indexer Proxy')).toBeInTheDocument();
    expect(screen.getByText('All indexer proxies are healthy')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('should render health check with warning status', () => {
    const check = {
      type: 'Download Client',
      source: 'Transmission',
      message: 'Download client is slow to respond',
      status: 'warning' as const,
      lastChecked: '2026-02-15T04:12:00Z',
    };

    render(<HealthCheck check={check} />);

    expect(screen.getByText('Transmission')).toBeInTheDocument();
    expect(screen.getByText('Download Client')).toBeInTheDocument();
    expect(screen.getByText('Download client is slow to respond')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
  });

  it('should render health check with error status', () => {
    const check = {
      type: 'Indexer',
      source: 'Test Indexer',
      message: 'Failed to connect to indexer',
      status: 'error' as const,
      lastChecked: '2026-02-15T04:11:00Z',
    };

    render(<HealthCheck check={check} />);

    expect(screen.getByText('Test Indexer')).toBeInTheDocument();
    expect(screen.getByText('Indexer')).toBeInTheDocument();
    expect(screen.getByText('Failed to connect to indexer')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('should render health check without lastChecked', () => {
    const check = {
      type: 'Test',
      source: 'Test Source',
      message: 'Test message',
      status: 'ok' as const,
    };

    render(<HealthCheck check={check} />);

    expect(screen.getByText('Test Source')).toBeInTheDocument();
    expect(screen.queryByText(/Last checked:/i)).not.toBeInTheDocument();
  });
});
