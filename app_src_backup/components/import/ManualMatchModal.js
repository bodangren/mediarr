'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';
import { mockSearchResults } from './types';
export function ManualMatchModal({ isOpen, onClose, series, onMatch }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    // Reset state when modal opens/closes or series changes
    useEffect(() => {
        if (isOpen && series) {
            setSearchTerm(series.folderName);
            setSelectedResult(null);
            // Auto-search on open
            performSearch(series.folderName);
        }
    }, [isOpen, series]);
    const performSearch = async (term) => {
        if (!term.trim()) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        // Mock implementation - replace with actual API call when backend is ready
        await new Promise(resolve => setTimeout(resolve, 800));
        // Filter mock results based on search term
        const filtered = mockSearchResults.filter(r => r.title.toLowerCase().includes(term.toLowerCase()));
        setResults(filtered);
        setIsSearching(false);
    };
    const handleSearch = (e) => {
        e.preventDefault();
        performSearch(searchTerm);
    };
    const handleSelect = (result) => {
        setSelectedResult(result);
    };
    const handleConfirm = () => {
        if (series && selectedResult) {
            onMatch(series.id, selectedResult);
            onClose();
        }
    };
    if (!series)
        return null;
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: "Manual Series Match", onClose: onClose, maxWidthClassName: "max-w-2xl", children: [_jsx(ModalHeader, { title: `Match: ${series.folderName}`, onClose: onClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-md border border-border-subtle bg-surface-2 p-3 text-sm", children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Detected from:" }), _jsx("p", { className: "font-medium text-text-primary", children: series.path }), _jsxs("p", { className: "text-xs text-text-secondary mt-1", children: [series.fileCount, " files found"] })] }), _jsxs("form", { onSubmit: handleSearch, className: "flex gap-2", children: [_jsx("input", { type: "text", value: searchTerm, onChange: e => setSearchTerm(e.target.value), placeholder: "Search for series...", className: "flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", "aria-label": "Search for series" }), _jsx(Button, { type: "submit", disabled: isSearching || !searchTerm.trim(), children: "Search" })] }), _jsx("div", { className: "max-h-80 space-y-2 overflow-y-auto", children: isSearching ? (_jsxs("div", { className: "space-y-2", children: [_jsx(SkeletonBlock, { className: "h-16 w-full" }), _jsx(SkeletonBlock, { className: "h-16 w-full" }), _jsx(SkeletonBlock, { className: "h-16 w-full" })] })) : results.length === 0 ? (_jsx("p", { className: "py-8 text-center text-sm text-text-secondary", children: "No results found. Try a different search term." })) : (results.map(result => (_jsxs("button", { type: "button", onClick: () => handleSelect(result), className: `w-full rounded-md border p-3 text-left transition ${selectedResult?.id === result.id
                                    ? 'border-accent-primary bg-accent-primary/10'
                                    : 'border-border-subtle bg-surface-1 hover:border-accent-primary/50'}`, children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-medium text-text-primary", children: [result.title, result.year && (_jsxs("span", { className: "ml-2 text-text-secondary", children: ["(", result.year, ")"] }))] }), result.network && (_jsx("p", { className: "text-xs text-text-secondary", children: result.network })), result.status && (_jsx("p", { className: "text-xs text-text-secondary capitalize", children: result.status }))] }), selectedResult?.id === result.id && (_jsx("span", { className: "text-accent-primary", children: "\u2713" }))] }), result.overview && (_jsx("p", { className: "mt-2 line-clamp-2 text-xs text-text-secondary", children: result.overview }))] }, result.id)))) })] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleConfirm, disabled: !selectedResult, children: "Confirm Match" })] })] }));
}
//# sourceMappingURL=ManualMatchModal.js.map