'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Folder, File, ArrowUp, Home, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
function formatFileSize(bytes) {
    if (!bytes)
        return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}
function formatDate(date) {
    if (!date)
        return '-';
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
}
function getPathParts(path) {
    if (path === '/')
        return [];
    return path.split('/').filter(Boolean);
}
function getParentPath(path) {
    if (path === '/')
        return '/';
    const parts = getPathParts(path);
    parts.pop();
    return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}
export function FileBrowser({ isOpen, title, initialPath = '/', selectFolder = false, entries = [], onPathChange, onSelect, onCancel, }) {
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [selectedPath, setSelectedPath] = useState(null);
    const items = useMemo(() => {
        return entries;
    }, [entries]);
    const pathParts = getPathParts(currentPath);
    const handleNavigate = (path) => {
        setCurrentPath(path);
        setSelectedPath(null);
        onPathChange?.(path);
    };
    const handleGoUp = () => {
        const parentPath = getParentPath(currentPath);
        handleNavigate(parentPath);
    };
    const handleGoHome = () => {
        handleNavigate('/');
    };
    const handleItemClick = (item) => {
        if (item.type === 'folder') {
            handleNavigate(item.path);
        }
        else if (!selectFolder) {
            setSelectedPath(item.path);
        }
    };
    const handleItemDoubleClick = (item) => {
        if (item.type === 'folder') {
            handleNavigate(item.path);
        }
    };
    const handleBreadcrumbClick = (index) => {
        const newPath = index === 0 ? '/' : `/${pathParts.slice(0, index).join('/')}`;
        handleNavigate(newPath);
    };
    const handleSelectFolder = () => {
        if (selectedPath || selectFolder) {
            onSelect(selectedPath || currentPath);
        }
    };
    const canSelect = selectFolder ? true : selectedPath !== null;
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: title, onClose: onCancel, maxWidthClassName: "max-w-3xl", children: [_jsx(ModalHeader, { title: title, onClose: onCancel }), _jsxs(ModalBody, { children: [_jsxs("div", { className: "mb-3 flex items-center gap-1 overflow-x-auto border-b border-border-subtle pb-2", children: [_jsxs("button", { type: "button", onClick: handleGoHome, className: "flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface-2", "aria-label": "Go to root", children: [_jsx(Home, { size: 14 }), _jsx("span", { children: "root" })] }), pathParts.map((part, index) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(ChevronRight, { size: 12, className: "text-text-muted" }), _jsx("button", { type: "button", onClick: () => handleBreadcrumbClick(index), className: "rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface-2", children: part })] }, index)))] }), _jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: handleGoUp, disabled: currentPath === '/', className: "inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-text-muted", "aria-label": "Go to parent directory", children: [_jsx(ArrowUp, { size: 14 }), _jsx("span", { children: "Up" })] }), _jsxs("span", { className: "text-xs text-text-muted", children: [items.length, " items"] })] }), _jsxs("div", { className: "rounded-sm border border-border-subtle", children: [_jsxs("div", { className: "grid grid-cols-[1fr,80px,100px,120px] gap-2 border-b border-border-subtle bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary", children: [_jsx("div", { children: "Name" }), _jsx("div", { children: "Type" }), _jsx("div", { children: "Size" }), _jsx("div", { children: "Modified" })] }), items.length === 0 ? (_jsx("div", { className: "px-3 py-8 text-center text-sm text-text-muted", children: "This folder is empty" })) : (items.map(item => {
                                const isSelected = selectedPath === item.path;
                                const ItemIcon = item.type === 'folder' ? Folder : File;
                                return (_jsxs("div", { onClick: () => handleItemClick(item), onDoubleClick: () => handleItemDoubleClick(item), className: `grid grid-cols-[1fr,80px,100px,120px] gap-2 border-b border-border-subtle px-3 py-2 text-xs text-text-primary hover:bg-surface-2 cursor-pointer ${isSelected ? 'bg-surface-2' : ''}`, role: "button", tabIndex: 0, onKeyDown: event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleItemClick(item);
                                        }
                                    }, children: [_jsxs("div", { className: "flex items-center gap-2 overflow-hidden", children: [_jsx(ItemIcon, { size: 14, className: "flex-shrink-0 text-text-secondary" }), _jsx("span", { className: "truncate", children: item.name })] }), _jsx("div", { className: "text-text-muted", children: item.type }), _jsx("div", { className: "text-text-muted", children: formatFileSize(item.size) }), _jsx("div", { className: "text-text-muted", children: formatDate(item.modified) })] }, item.path));
                            }))] }), selectFolder ? (_jsxs("div", { className: "mt-3 text-xs text-text-secondary", children: ["Current folder: ", _jsx("span", { className: "text-text-primary font-medium", children: currentPath })] })) : (selectedPath && (_jsxs("div", { className: "mt-3 text-xs text-text-secondary", children: ["Selected: ", _jsx("span", { className: "text-text-primary font-medium", children: selectedPath })] })))] }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onCancel, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSelectFolder, disabled: !canSelect, children: "Select" })] })] }));
}
//# sourceMappingURL=FileBrowser.js.map