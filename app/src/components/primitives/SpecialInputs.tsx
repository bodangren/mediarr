
import { useMemo, useState } from 'react';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}

interface PathInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBrowse?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

interface NumberInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

interface AutoCompleteInputProps {
  id: string;
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function clampValue(value: number, min?: number, max?: number) {
  if (typeof min === 'number' && value < min) {
    return min;
  }

  if (typeof max === 'number' && value > max) {
    return max;
  }

  return value;
}

export function PasswordInput({ id, value, onChange, disabled = false, placeholder, error }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          id={id}
          aria-label={id}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={event => onChange(event.target.value)}
          className="w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisible(previous => !previous)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="rounded-sm border border-border-subtle px-2 py-2 text-xs text-text-secondary"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? <p role="alert" className="text-xs text-status-error">{error}</p> : null}
    </div>
  );
}

export function PathInput({ id, value, onChange, onBrowse, disabled = false, placeholder }: PathInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        aria-label={id}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onBrowse}
        className="rounded-sm border border-border-subtle px-3 py-2 text-xs text-text-secondary"
      >
        Browse
      </button>
    </div>
  );
}

export function NumberInput({ id, value, onChange, min, max, step = 1, disabled = false }: NumberInputProps) {
  return (
    <input
      id={id}
      aria-label={id}
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={event => {
        const parsed = Number(event.target.value);
        if (Number.isNaN(parsed)) {
          return;
        }

        onChange(clampValue(parsed, min, max));
      }}
      className="w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm"
    />
  );
}

export function AutoCompleteInput({
  id,
  value,
  suggestions,
  onChange,
  onSelect,
  disabled = false,
  placeholder,
}: AutoCompleteInputProps) {
  const filteredSuggestions = useMemo(() => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return suggestions.slice(0, 8);
    }

    return suggestions.filter(item => item.toLowerCase().includes(normalized)).slice(0, 8);
  }, [suggestions, value]);

  return (
    <div className="space-y-2">
      <input
        id={id}
        aria-label={id}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm"
      />
      {filteredSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filteredSuggestions.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(suggestion);
                onSelect?.(suggestion);
              }}
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
