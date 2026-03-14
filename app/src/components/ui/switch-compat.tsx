/**
 * Switch compatibility wrapper — exposes the legacy Switch API (onChange prop)
 * while delegating to the shadcn/ui Switch (onCheckedChange prop).
 */
import { Switch as ShadcnSwitch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  'aria-label'?: string;
  className?: string;
}

export function Switch({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  'aria-label': ariaLabel,
  className,
}: SwitchProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <ShadcnSwitch
          id={id}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
        />
        <Label
          htmlFor={id}
          className={cn('text-sm text-text-primary', disabled && 'text-text-muted')}
        >
          {label}
        </Label>
      </div>
    );
  }

  return (
    <ShadcnSwitch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
