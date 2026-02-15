import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UiSettingsPage from './page';

vi.mock('../page', () => ({
  default: () => <div data-testid="ui-settings-surface">UI Settings</div>,
}));

describe('settings ui page', () => {
  it('reuses the main settings surface', () => {
    render(<UiSettingsPage />);
    expect(screen.getByTestId('ui-settings-surface')).toBeInTheDocument();
  });
});
