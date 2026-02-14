'use client';

import { useMemo, useState, type FormEventHandler, type ReactNode } from 'react';

interface OptionItem {
  value: string;
  label: string;
}

interface FormProps {
  children: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  className?: string;
}

interface FormGroupProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

interface TextInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'email' | 'url' | 'search';
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  ariaLabel?: string;
}

interface SelectInputProps {
  id: string;
  label: string;
  value: string;
  options: OptionItem[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface EnhancedSelectInputProps {
  id: string;
  label: string;
  value: string;
  options: OptionItem[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface CheckInputProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

interface TagInputProps {
  id: string;
  label: string;
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function Form({ children, onSubmit, className }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className ?? ''}`.trim()}>
      {children}
    </form>
  );
}

export function FormGroup({ label, htmlFor, hint, error, children }: FormGroupProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
      {children}
      {error ? <p className="text-xs text-status-error" role="alert">{error}</p> : null}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  error,
  ariaLabel,
}: TextInputProps) {
  return (
    <div className="space-y-1">
      <input
        id={id}
        type={type}
        value={value}
        aria-label={ariaLabel ?? id}
        placeholder={placeholder}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary"
      />
      {error ? <p className="text-xs text-status-error" role="alert">{error}</p> : null}
    </div>
  );
}

export function SelectInput({ id, label, value, options, onChange, disabled = false }: SelectInputProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm text-text-primary">
      <span>{label}</span>
      <select
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EnhancedSelectInput({ id, label, value, options, onChange, disabled = false }: EnhancedSelectInputProps) {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!query.trim()) {
      return options;
    }

    const normalized = query.trim().toLowerCase();
    return options.filter(option => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const selectedLabel = options.find(option => option.value === value)?.label ?? 'None';

  return (
    <div id={id} className="space-y-2 rounded-sm border border-border-subtle p-3">
      <label className="flex flex-col gap-1 text-sm text-text-primary">
        <span>{label}</span>
        <input
          type="text"
          aria-label={`${label} search`}
          value={query}
          disabled={disabled}
          onChange={event => setQuery(event.target.value)}
          className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm"
        />
      </label>
      <p className="text-xs text-text-secondary">Selected: {selectedLabel}</p>
      <div className="flex flex-wrap gap-2">
        {filteredOptions.map(option => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-sm border px-2 py-1 text-xs ${value === option.value ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-border-subtle text-text-secondary'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckInput({ id, label, checked, onChange, disabled = false }: CheckInputProps) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 text-sm text-text-primary">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function TagInput({ id, label, availableTags, selectedTags, onChange, disabled = false }: TagInputProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(item => item !== tag));
      return;
    }

    onChange([...selectedTags, tag]);
  };

  return (
    <div id={id} className="space-y-2">
      <p className="text-sm text-text-primary">{label}</p>
      <div className="flex flex-wrap gap-2">
        {availableTags.map(tag => {
          const selected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => toggleTag(tag)}
              className={`rounded-sm border px-2 py-1 text-xs ${selected ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-border-subtle text-text-secondary'}`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
