interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  'aria-label'?: string;
}

export function Switch({ checked, onChange, disabled = false, label, 'aria-label': ariaLabel }: SwitchProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  const switchElement = (
    <label className="relative inline-flex items-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        aria-label={ariaLabel ?? label}
        className="peer sr-only"
      />
      <div
        className={`
          h-5 w-9 rounded-full border transition-colors duration-200
          ${checked ? 'border-accent-primary bg-accent-primary' : 'border-border-subtle bg-surface-2'}
          ${disabled ? 'opacity-50' : 'cursor-pointer'}
        `}
      />
      <div
        className={`
          absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white
          transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </label>
  );

  if (label) {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-text-primary">
        {switchElement}
        <span className={disabled ? 'text-text-muted' : ''}>{label}</span>
      </label>
    );
  }

  return switchElement;
}
