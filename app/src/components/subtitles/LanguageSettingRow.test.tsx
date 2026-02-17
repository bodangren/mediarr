import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageSettingRow } from './LanguageSettingRow';
import type { LanguageSetting } from '@/lib/api/languageProfilesApi';

describe('LanguageSettingRow', () => {
  const mockSetting: LanguageSetting = {
    languageCode: 'en',
    isForced: false,
    isHi: false,
    audioExclude: false,
    score: 50,
  };

  const handleChange = vi.fn();
  const handleRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders language name and code', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('(en)')).toBeInTheDocument();
  });

  it('renders checkboxes with correct initial values', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    const forcedCheckbox = screen.getByLabelText('Forced');
    const hiCheckbox = screen.getByLabelText('HI');
    const audioExcludeCheckbox = screen.getByLabelText('Audio Exclude');

    expect(forcedCheckbox).not.toBeChecked();
    expect(hiCheckbox).not.toBeChecked();
    expect(audioExcludeCheckbox).not.toBeChecked();
  });

  it('renders score input with correct value', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    const scoreInput = screen.getByLabelText('en score');
    expect(scoreInput).toHaveValue('50');
  });

  it('calls onChange when checkbox is changed', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    const forcedCheckbox = screen.getByLabelText('Forced');
    fireEvent.click(forcedCheckbox);

    expect(handleChange).toHaveBeenCalledWith({
      ...mockSetting,
      isForced: true,
    });
  });

  it('calls onChange when score is changed', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    const scoreInput = screen.getByLabelText('en score');
    fireEvent.change(scoreInput, { target: { value: '75' } });

    expect(handleChange).toHaveBeenCalledWith({
      ...mockSetting,
      score: 75,
    });
  });

  it('calls onRemove when remove button is clicked', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    const removeButton = screen.getByLabelText('Remove en');
    fireEvent.click(removeButton);

    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
        disabled
      />,
    );

    const forcedCheckbox = screen.getByLabelText('Forced');
    const hiCheckbox = screen.getByLabelText('HI');
    const audioExcludeCheckbox = screen.getByLabelText('Audio Exclude');
    const scoreInput = screen.getByLabelText('en score');
    const removeButton = screen.getByLabelText('Remove en');

    expect(forcedCheckbox).toBeDisabled();
    expect(hiCheckbox).toBeDisabled();
    expect(audioExcludeCheckbox).toBeDisabled();
    expect(scoreInput).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });

  it('renders with all checkboxes checked', () => {
    const allChecked: LanguageSetting = {
      languageCode: 'fr',
      isForced: true,
      isHi: true,
      audioExclude: true,
      score: 100,
    };

    render(
      <LanguageSettingRow
        setting={allChecked}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    expect(screen.getByLabelText('Forced')).toBeChecked();
    expect(screen.getByLabelText('HI')).toBeChecked();
    expect(screen.getByLabelText('Audio Exclude')).toBeChecked();
  });

  it('clamps score input to valid range', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    const scoreInput = screen.getByLabelText('en score');
    fireEvent.change(scoreInput, { target: { value: '150' } });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 150,
      }),
    );
  });

  it('handles empty score input', () => {
    render(
      <LanguageSettingRow
        setting={mockSetting}
        onChange={handleChange}
        onRemove={handleRemove}
      />,
    );

    const scoreInput = screen.getByLabelText('en score');
    fireEvent.change(scoreInput, { target: { value: '' } });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 0,
      }),
    );
  });
});
