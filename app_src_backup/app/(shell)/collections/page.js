'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Icon } from '@/components/primitives/Icon';
import { CollectionGrid } from '@/components/collections';
import { EditCollectionModal } from '@/components/collections';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
export default function CollectionsPage() {
    const { collectionApi } = getApiClients();
    const { data: collections = [], isPending, isError, refetch } = useQuery({
        queryKey: queryKeys.collections(),
        queryFn: () => collectionApi.list(),
    });
    const [editingCollection, setEditingCollection] = useState(null);
    const [search, setSearch] = useState('');
    const handleToggleMonitored = (id, monitored) => {
        // TODO: Wire to collectionApi.update() in Phase 3
        console.log('Toggle monitored for collection', id, monitored);
    };
    const handleSearch = async (id) => {
        const collection = collections.find(col => col.id === id);
        if (collection) {
            try {
                await collectionApi.search(id);
                // Optionally show success feedback or refetch
            }
            catch (error) {
                console.error('Failed to search collection:', error);
                // Optionally show error feedback
            }
        }
    };
    const handleEdit = (collection) => {
        setEditingCollection(collection);
    };
    const handleDelete = (id) => {
        const collection = collections.find(col => col.id === id);
        if (collection && window.confirm(`Delete collection "${collection.name}"?`)) {
            // TODO: Wire to collectionApi.delete() in Phase 3
            console.log('Delete collection', id);
            refetch();
        }
    };
    const handleSaveEdit = (collectionId, data) => {
        // TODO: Wire to collectionApi.update() in Phase 3
        console.log('Save collection', collectionId, data);
        setEditingCollection(null);
        refetch();
    };
    const filteredCollections = search
        ? collections.filter(col => col.name.toLowerCase().includes(search.toLowerCase()))
        : collections;
    const monitoredCount = collections.filter(col => col.monitored).length;
    return (_jsxs("section", { className: "space-y-4", children: [_jsx("header", { className: "flex items-start justify-between gap-4", children: _jsxs("div", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Collections" }), _jsxs("p", { className: "text-sm text-text-secondary", children: ["Manage movie collections with progress tracking and bulk operations. ", monitoredCount, " of ", collections.length, " monitored."] })] }) }), _jsxs("label", { className: "block w-full max-w-md space-y-1 text-sm", children: [_jsx("span", { className: "sr-only", children: "Search collections" }), _jsxs("div", { className: "relative", children: [_jsx(Icon, { name: "search", className: "absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" }), _jsx("input", { type: "text", value: search, onChange: event => setSearch(event.currentTarget.value), placeholder: "Search collections...", className: "w-full rounded-sm border border-border-subtle bg-surface-1 pl-10 pr-3 py-2" })] })] }), _jsx(QueryPanel, { isLoading: isPending, isError: isError, isEmpty: filteredCollections.length === 0, emptyTitle: "No collections found", emptyBody: "Try adjusting your search or add a new collection.", onRetry: () => refetch(), children: _jsx(CollectionGrid, { collections: filteredCollections, onToggleMonitored: handleToggleMonitored, onSearch: handleSearch, onEdit: handleEdit, onDelete: handleDelete }) }), editingCollection && (_jsx(EditCollectionModal, { collection: editingCollection, isOpen: true, onClose: () => setEditingCollection(null), onSave: handleSaveEdit }))] }));
}
//# sourceMappingURL=page.js.map