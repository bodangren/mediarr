import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusBadge } from '@/components/primitives/StatusBadge';
export function ProviderStatusBadge({ status, lastError, provider }) {
    const displayStatus = provider?.enabled ? (provider.status === 'error' ? 'error' : 'active') : 'disabled';
    const errorMessage = lastError ?? provider?.lastError;
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `
          h-2 w-2 rounded-full
          ${displayStatus === 'active' ? 'bg-status-error' : ''}
          ${displayStatus === 'error' ? 'bg-status-error' : ''}
          ${displayStatus === 'disabled' ? 'bg-text-muted' : ''}
        ` }), _jsx(StatusBadge, { status: displayStatus === 'active' ? 'completed' : displayStatus }), errorMessage && displayStatus === 'error' && (_jsx("span", { className: "max-w-[200px] truncate text-xs text-status-error", title: errorMessage, children: errorMessage }))] }));
}
//# sourceMappingURL=ProviderStatusBadge.js.map