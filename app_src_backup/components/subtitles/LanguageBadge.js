'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const VARIANT_CLASS = {
    available: 'bg-accent-success/20 text-accent-success border-accent-success/30',
    missing: 'bg-surface-2 text-text-muted border-border-subtle',
    searching: 'bg-accent-warning/20 text-accent-warning border-accent-warning/30 animate-pulse',
};
export function LanguageBadge({ languageCode, variant, isForced = false, isHi = false, onClick, className = '', ...props }) {
    const baseClasses = 'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors';
    const variantClasses = VARIANT_CLASS[variant];
    const clickClasses = onClick
        ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent-primary/50'
        : '';
    const indicators = [];
    if (isForced)
        indicators.push('(F)');
    if (isHi)
        indicators.push('(HI)');
    return (_jsxs("span", { className: `${baseClasses} ${variantClasses} ${clickClasses} ${className}`, onClick: onClick, "aria-label": `Language: ${languageCode}${indicators.length ? ` ${indicators.join(' ')}` : ''}`, role: onClick ? 'button' : undefined, tabIndex: onClick ? 0 : undefined, onKeyDown: onClick ? (e) => e.key === 'Enter' && onClick() : undefined, ...props, children: [languageCode, indicators.length > 0 && (_jsx("span", { className: "text-[10px] opacity-75", children: indicators.join(' ') }))] }));
}
//# sourceMappingURL=LanguageBadge.js.map