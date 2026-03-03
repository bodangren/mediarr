'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from '@/components/primitives/Icon';
import { CollectionCard } from './CollectionCard';
export function CollectionGrid({ collections, onToggleMonitored, onSearch, onEdit, onDelete, }) {
    if (collections.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-1 py-12", children: [_jsx(Icon, { name: "grid", className: "mb-4 h-12 w-12 text-text-muted" }), _jsx("p", { className: "text-center text-text-secondary", children: "No collections found" })] }));
    }
    return (_jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4", children: collections.map(collection => (_jsx(CollectionCard, { collection: collection, onToggleMonitored: onToggleMonitored, onSearch: onSearch, onEdit: onEdit, onDelete: onDelete }, collection.id))) }));
}
//# sourceMappingURL=CollectionGrid.js.map