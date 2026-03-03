import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
export const PeersCell = memo(function PeersCell({ seeders, leechers }) {
    const hasSeeders = seeders !== undefined && seeders !== null;
    const hasLeechers = leechers !== undefined && leechers !== null;
    if (!hasSeeders && !hasLeechers) {
        return _jsx("span", { className: "text-text-secondary", children: "-" });
    }
    return (_jsxs("div", { className: "flex items-center gap-3 text-xs", children: [hasSeeders && (_jsxs("div", { className: "flex items-center gap-1", title: "Seeders", children: [_jsx(ArrowUp, { className: "text-green-400", size: 14 }), _jsx("span", { className: seeders > 0 ? 'text-green-400' : 'text-text-secondary', children: seeders })] })), hasLeechers && (_jsxs("div", { className: "flex items-center gap-1", title: "Leechers", children: [_jsx(ArrowDown, { className: "text-red-400", size: 14 }), _jsx("span", { className: leechers > 0 ? 'text-red-400' : 'text-text-secondary', children: leechers })] }))] }));
});
//# sourceMappingURL=PeersCell.js.map