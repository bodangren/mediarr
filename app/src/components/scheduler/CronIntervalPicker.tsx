import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PRESETS = [
  { label: '15m', cron: '*/15 * * * *' },
  { label: '30m', cron: '*/30 * * * *' },
  { label: '1h', cron: '0 * * * *' },
  { label: '6h', cron: '0 */6 * * *' },
  { label: '12h', cron: '0 */12 * * *' },
  { label: '24h', cron: '0 0 * * *' },
] as const;

function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const fieldPattern = /^(\*|(\d+)(-\d+)?|\*\/\d+|\d+(,\d+)*)$/;
  return parts.every((part) => fieldPattern.test(part));
}

interface CronIntervalPickerProps {
  value: string;
  onChange: (cron: string) => void;
  disabled?: boolean;
}

export function CronIntervalPicker({ value, onChange, disabled }: CronIntervalPickerProps) {
  const [customValue, setCustomValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const handlePresetClick = (cron: string) => {
    setCustomValue(cron);
    setError(null);
    onChange(cron);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomValue(e.target.value);
  };

  const handleCustomBlur = () => {
    const trimmed = customValue.trim();
    if (isValidCron(trimmed)) {
      setError(null);
      onChange(trimmed);
    } else if (trimmed.length > 0) {
      setError('Invalid cron expression');
    } else {
      setError(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            role="button"
            aria-pressed={value === preset.cron}
            disabled={disabled}
            onClick={() => handlePresetClick(preset.cron)}
            className={cn(value === preset.cron && 'border-white text-white')}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor="custom-cron" className="text-sm font-medium">
          Custom cron expression
        </label>
        <Input
          id="custom-cron"
          value={customValue}
          onChange={handleCustomChange}
          onBlur={handleCustomBlur}
          disabled={disabled}
          placeholder="*/15 * * * *"
        />
        {error && (
          <p className="text-xs text-status-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
