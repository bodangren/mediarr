import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageSelector } from './LanguageSelector';

describe('LanguageSelector', () => {
  it('renders with label and select button', () => {
    render(<LanguageSelector value="en" onChange={vi.fn()} label="Language" id="language-select" />);

    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByText(/English.*en/)).toBeInTheDocument();
  });

  it('displays selected language correctly', () => {
    render(<LanguageSelector value="fr" onChange={vi.fn()} />);

    expect(screen.getByText(/French.*fr/)).toBeInTheDocument();
  });

  it('displays placeholder when no language is selected', () => {
    render(<LanguageSelector value="" onChange={vi.fn()} />);

    expect(screen.getByText('Select language...')).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', () => {
    render(<LanguageSelector value="en" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Select language' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('calls onChange when language is selected', () => {
    const handleChange = vi.fn();
    render(<LanguageSelector value="" onChange={handleChange} />);

    const button = screen.getByRole('button', { name: 'Select language' });
    fireEvent.click(button);

    const frenchOption = screen.getByText(/French.*fr/);
    fireEvent.click(frenchOption);

    expect(handleChange).toHaveBeenCalledWith('fr');
  });

  it('filters languages by exclude prop', () => {
    render(<LanguageSelector value="" onChange={vi.fn()} exclude={['en', 'es']} />);

    const button = screen.getByRole('button', { name: 'Select language' });
    fireEvent.click(button);

    expect(screen.queryByText(/English.*en/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Spanish.*es/)).not.toBeInTheDocument();
    expect(screen.getByText(/French.*fr/)).toBeInTheDocument();
  });

  it('filters languages by search query', () => {
    render(<LanguageSelector value="" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Select language' });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText('Search languages...');
    fireEvent.change(searchInput, { target: { value: 'span' } });

    expect(screen.getByText(/Spanish.*es/)).toBeInTheDocument();
    expect(screen.queryByText(/English.*en/)).not.toBeInTheDocument();
  });

  it('shows no results message when search matches nothing', () => {
    render(<LanguageSelector value="" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Select language' });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText('Search languages...');
    fireEvent.change(searchInput, { target: { value: 'xyz123' } });

    expect(screen.getByText('No languages found')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', () => {
    render(<LanguageSelector value="en" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Select language' });
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click backdrop
    const backdrop = screen.getByText('English (en)').parentElement?.parentElement?.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<LanguageSelector value="en" onChange={vi.fn()} disabled />);

    const button = screen.getByRole('button', { name: 'Select language' });
    expect(button).toBeDisabled();
  });

  it('applies custom className', () => {
    render(
      <LanguageSelector value="en" onChange={vi.fn()} className="custom-class" />,
    );

    const container = screen.getByLabelText('Select language').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});
