import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AutoCompleteInput, NumberInput, PasswordInput, PathInput } from './SpecialInputs';

describe('Specialized inputs', () => {
  it('toggles password visibility and propagates input changes', () => {
    const onChange = vi.fn();

    render(<PasswordInput id="apiPassword" value="secret" onChange={onChange} />);

    const passwordField = screen.getByLabelText('apiPassword');
    expect(passwordField).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordField).toHaveAttribute('type', 'text');

    fireEvent.change(passwordField, { target: { value: 'updated-secret' } });
    expect(onChange).toHaveBeenCalledWith('updated-secret');
  });

  it('supports path input editing and browse action callback', () => {
    const onChange = vi.fn();
    const onBrowse = vi.fn();

    render(<PathInput id="downloadPath" value="/downloads" onChange={onChange} onBrowse={onBrowse} />);

    fireEvent.change(screen.getByLabelText('downloadPath'), { target: { value: '/data/downloads' } });
    fireEvent.click(screen.getByRole('button', { name: 'Browse' }));

    expect(onChange).toHaveBeenCalledWith('/data/downloads');
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });

  it('normalizes numeric input values within bounds', () => {
    const onChange = vi.fn();

    render(<NumberInput id="priority" value={10} min={0} max={50} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('priority'), { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith(42);

    fireEvent.change(screen.getByLabelText('priority'), { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('filters autocomplete suggestions and selects an option', () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <AutoCompleteInput
        id="indexerSearch"
        value=""
        suggestions={['NinjaCentral', 'RARBG', '1337x']}
        onChange={onChange}
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByLabelText('indexerSearch'), { target: { value: 'rar' } });
    fireEvent.click(screen.getByRole('button', { name: 'RARBG' }));

    expect(onChange).toHaveBeenNthCalledWith(1, 'rar');
    expect(onChange).toHaveBeenNthCalledWith(2, 'RARBG');
    expect(onSelect).toHaveBeenCalledWith('RARBG');
  });
});
