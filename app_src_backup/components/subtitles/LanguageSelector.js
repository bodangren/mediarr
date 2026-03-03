'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { COMMON_LANGUAGES } from '@/lib/constants/languages';
export function LanguageSelector({ value, onChange, exclude = [], label, id, disabled = false, className = '', }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // Filter out excluded languages and search results
    const availableLanguages = useMemo(() => {
        let languages = COMMON_LANGUAGES.filter(lang => !exclude.includes(lang.code));
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            languages = languages.filter(lang => lang.code.toLowerCase().includes(query) ||
                lang.name.toLowerCase().includes(query));
        }
        return languages;
    }, [exclude, searchQuery]);
    const selectedLanguage = useMemo(() => {
        return COMMON_LANGUAGES.find(lang => lang.code === value);
    }, [value]);
    const handleSelect = (code) => {
        onChange(code);
        setIsOpen(false);
        setSearchQuery('');
    };
    return (_jsxs("div", { className: `relative ${className}`, children: [label && (_jsx("label", { htmlFor: id, className: "mb-1 block text-sm font-medium text-text-primary", children: label })), _jsxs("button", { type: "button", id: id, onClick: () => !disabled && setIsOpen(!isOpen), disabled: disabled, className: `
          w-full flex items-center justify-between gap-2 rounded-md border
          border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary
          transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/50
          disabled:cursor-not-allowed disabled:opacity-50
          ${!disabled ? 'hover:border-border-subtle/70' : ''}
        `, "aria-haspopup": "listbox", "aria-expanded": isOpen, "aria-label": label || 'Select language', children: [_jsx("span", { className: "truncate", children: selectedLanguage
                            ? `${selectedLanguage.name} (${selectedLanguage.code})`
                            : 'Select language...' }), _jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-text-muted" })] }), isOpen && (_jsxs("div", { className: "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border-subtle bg-surface-2 shadow-elevation-3", children: [_jsx("div", { className: "sticky top-0 border-b border-border-subtle bg-surface-2 p-2", children: _jsx("input", { type: "text", value: searchQuery, onChange: e => setSearchQuery(e.target.value), placeholder: "Search languages...", className: "w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary/50", autoFocus: true }) }), _jsx("ul", { role: "listbox", className: "py-1", children: availableLanguages.length > 0 ? (availableLanguages.map(lang => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => handleSelect(lang.code), className: `
                      w-full px-3 py-1.5 text-left text-sm transition-colors
                      ${value === lang.code
                                    ? 'bg-accent-primary/20 text-accent-primary'
                                    : 'text-text-primary hover:bg-surface-3'}
                    `, role: "option", "aria-selected": value === lang.code, children: [_jsx("span", { className: "font-medium", children: lang.name }), _jsxs("span", { className: "ml-2 text-text-muted", children: ["(", lang.code, ")"] })] }) }, lang.code)))) : (_jsx("li", { className: "px-3 py-2 text-sm text-text-muted", children: searchQuery ? 'No languages found' : 'No languages available' })) })] })), isOpen && (_jsx("div", { className: "fixed inset-0 z-40", onClick: () => setIsOpen(false), "aria-hidden": "true" }))] }));
}
//# sourceMappingURL=LanguageSelector.js.map