import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProviderTestResult } from './ProviderTestResult';

describe('ProviderTestResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not render when no result and not testing', () => {
    const { container } = render(
      <ProviderTestResult result={null} isTesting={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders loading state while testing', () => {
    render(
      <ProviderTestResult result={null} isTesting={true} />,
    );

    expect(screen.getByText('Testing connection...')).toBeInTheDocument();
    expect(screen.getByLabelText('Testing')).toBeInTheDocument();
  });

  it('renders success message after successful test', () => {
    const successResult = {
      success: true,
      message: 'Connection successful',
    };

    render(
      <ProviderTestResult result={successResult} isTesting={false} />,
    );

    expect(screen.getByText('Connection successful')).toBeInTheDocument();
    expect(screen.getByLabelText('Success')).toBeInTheDocument();
  });

  it('renders error message after failed test', () => {
    const errorResult = {
      success: false,
      message: 'Authentication failed',
    };

    render(
      <ProviderTestResult result={errorResult} isTesting={false} />,
    );

    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    expect(screen.getByLabelText('Error')).toBeInTheDocument();
  });

  it('updates when result changes', () => {
    const { rerender } = render(
      <ProviderTestResult result={null} isTesting={false} />,
    );

    expect(screen.queryByText('Initial message')).not.toBeInTheDocument();

    const newResult = {
      success: true,
      message: 'New message',
    };

    rerender(
      <ProviderTestResult result={newResult} isTesting={false} />,
    );

    expect(screen.getByText('New message')).toBeInTheDocument();
  });

  it('updates when result changes', () => {
    const { rerender } = render(
      <ProviderTestResult result={null} isTesting={false} />,
    );

    expect(screen.queryByText('Initial message')).not.toBeInTheDocument();

    const newResult = {
      success: true,
      message: 'New message',
    };

    rerender(
      <ProviderTestResult result={newResult} isTesting={false} />,
    );

    expect(screen.getByText('New message')).toBeInTheDocument();
  });

  it('shows loading when testing transitions to true', () => {
    const { rerender } = render(
      <ProviderTestResult result={null} isTesting={false} />,
    );

    expect(screen.queryByText('Testing connection...')).not.toBeInTheDocument();

    rerender(
      <ProviderTestResult result={null} isTesting={true} />,
    );

    expect(screen.getByText('Testing connection...')).toBeInTheDocument();
  });
});
