import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GeneralSettingsPage from './page';

vi.mock('../page', () => ({
  default: () => <div data-testid="general-settings-surface">General Settings</div>,
}));

describe('settings general page', () => {
  it('reuses the main settings surface', () => {
    render(<GeneralSettingsPage />);
    expect(screen.getByTestId('general-settings-surface')).toBeInTheDocument();
  });
});
