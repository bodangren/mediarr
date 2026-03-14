
import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { COMMON_LANGUAGES } from '@/lib/constants/languages';
import type { Language } from '@/lib/constants/languages';

export interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  exclude?: string[];
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function LanguageSelector({
  value,
  onChange,
  exclude = [],
  label,
  id,
  disabled = false,
  className = '',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out excluded languages and search results
  const availableLanguages = useMemo(() => {
    let languages = COMMON_LANGUAGES.filter(lang => !exclude.includes(lang.code));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      languages = languages.filter(
        lang =>
          lang.code.toLowerCase().includes(query) ||
          lang.name.toLowerCase().includes(query),
      );
    }

    return languages;
  }, [exclude, searchQuery]);

  const selectedLanguage = useMemo(() => {
    return COMMON_LANGUAGES.find(lang => lang.code === value);
  }, [value]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}

      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 rounded-md border
          border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary
          transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/50
          disabled:cursor-not-allowed disabled:opacity-50
          ${!disabled ? 'hover:border-border-subtle/70' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label || 'Select language'}
      >
        <span className="truncate">
          {selectedLanguage
            ? `${selectedLanguage.name} (${selectedLanguage.code})`
            : 'Select language...'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border-subtle bg-surface-2 shadow-elevation-3">
          {/* Search Input */}
          <div className="sticky top-0 border-b border-border-subtle bg-surface-2 p-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search languages..."
              className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
              autoFocus
            />
          </div>

          {/* Language List */}
          <ul role="listbox" className="py-1">
            {availableLanguages.length > 0 ? (
              availableLanguages.map(lang => (
                <li key={lang.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`
                      w-full px-3 py-1.5 text-left text-sm transition-colors
                      ${
                        value === lang.code
                          ? 'bg-accent-primary/20 text-accent-primary'
                          : 'text-text-primary hover:bg-surface-3'
                      }
                    `}
                    role="option"
                    aria-selected={value === lang.code}
                  >
                    <span className="font-medium">{lang.name}</span>
                    <span className="ml-2 text-text-muted">({lang.code})</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-text-muted">
                {searchQuery ? 'No languages found' : 'No languages available'}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
