
import type { LanguageSetting } from '@/lib/api/languageProfilesApi';
import { getLanguageName } from '@/lib/constants/languages';
import { Trash2 } from 'lucide-react';

export interface LanguageSettingRowProps {
  setting: LanguageSetting;
  onChange: (setting: LanguageSetting) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function LanguageSettingRow({
  setting,
  onChange,
  onRemove,
  disabled = false,
}: LanguageSettingRowProps) {
  const handleChange = <K extends keyof LanguageSetting>(
    key: K,
    value: LanguageSetting[K],
  ) => {
    onChange({ ...setting, [key]: value });
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-1 p-3">
      {/* Language Name */}
      <div className="flex-1 min-w-[150px]">
        <span className="text-sm font-medium text-text-primary">
          {getLanguageName(setting.languageCode)}
        </span>
        <span className="ml-2 text-xs text-text-muted">({setting.languageCode})</span>
      </div>

      {/* Checkboxes */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={setting.isForced}
            onChange={e => handleChange('isForced', e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-border-subtle bg-surface-2 text-accent-primary focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          Forced
        </label>

        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={setting.isHi}
            onChange={e => handleChange('isHi', e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-border-subtle bg-surface-2 text-accent-primary focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          HI
        </label>

        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={setting.audioExclude}
            onChange={e => handleChange('audioExclude', e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-border-subtle bg-surface-2 text-accent-primary focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          Audio Exclude
        </label>
      </div>

      {/* Score Input */}
      <div className="flex items-center gap-2">
        <label htmlFor={`score-${setting.languageCode}`} className="text-xs text-text-secondary">
          Score:
        </label>
        <input
          id={`score-${setting.languageCode}`}
          type="number"
          min="0"
          max="100"
          value={setting.score}
          onChange={e => handleChange('score', parseInt(e.target.value, 10) || 0)}
          disabled={disabled}
          className="w-16 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`${setting.languageCode} score`}
        />
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-accent-danger disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Remove ${setting.languageCode}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
