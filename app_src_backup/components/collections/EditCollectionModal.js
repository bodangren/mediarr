'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
export function EditCollectionModal({ collection, isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: collection.name,
        overview: collection.overview ?? '',
        monitored: collection.monitored,
        minimumAvailability: 'released',
        qualityProfileId: 1,
        rootFolder: '/movies',
        searchOnAdd: true,
    });
    const handleSubmit = (event) => {
        event.preventDefault();
        onSave(collection.id, formData);
        onClose();
    };
    if (!isOpen) {
        return null;
    }
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: "Edit Collection", onClose: onClose, maxWidthClassName: "max-w-lg", children: [_jsx(ModalHeader, { title: "Edit Collection", onClose: onClose }), _jsx(ModalBody, { children: _jsxs("form", { id: "edit-collection-form", onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Collection Name" }), _jsx("input", { type: "text", value: formData.name, onChange: event => setFormData(current => ({ ...current, name: event.currentTarget.value })), required: true, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", placeholder: "Enter collection name" })] }), _jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Overview" }), _jsx("textarea", { value: formData.overview, onChange: event => setFormData(current => ({ ...current, overview: event.currentTarget.value })), rows: 3, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 resize-y", placeholder: "Enter collection overview" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Minimum Availability" }), _jsxs("select", { value: formData.minimumAvailability, onChange: event => setFormData(current => ({ ...current, minimumAvailability: event.currentTarget.value })), className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", children: [_jsx("option", { value: "announced", children: "Announced" }), _jsx("option", { value: "inCinemas", children: "In Cinemas" }), _jsx("option", { value: "released", children: "Released" }), _jsx("option", { value: "preDB", children: "PreDB" })] })] }), _jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Quality Profile" }), _jsxs("select", { value: formData.qualityProfileId, onChange: event => setFormData(current => ({
                                                ...current,
                                                qualityProfileId: Number.parseInt(event.currentTarget.value, 10),
                                            })), className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", children: [_jsx("option", { value: "1", children: "Default" }), _jsx("option", { value: "2", children: "HD - 720p" }), _jsx("option", { value: "3", children: "Full HD - 1080p" }), _jsx("option", { value: "4", children: "Ultra HD - 4K" })] })] })] }), _jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Root Folder" }), _jsx("input", { type: "text", value: formData.rootFolder, onChange: event => setFormData(current => ({ ...current, rootFolder: event.currentTarget.value })), required: true, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", placeholder: "/path/to/movies" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "searchOnAdd", checked: formData.searchOnAdd, onChange: event => setFormData(current => ({ ...current, searchOnAdd: event.currentTarget.checked })), className: "rounded-sm border-border-subtle bg-surface-0" }), _jsx("label", { htmlFor: "searchOnAdd", className: "text-sm text-text-primary", children: "Search for missing movies when adding collection" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "monitored", checked: formData.monitored, onChange: event => setFormData(current => ({ ...current, monitored: event.currentTarget.checked })), className: "rounded-sm border-border-subtle bg-surface-0" }), _jsx("label", { htmlFor: "monitored", className: "text-sm text-text-primary", children: "Monitored" })] })] }) }), _jsxs(ModalFooter, { children: [_jsx("button", { type: "button", onClick: onClose, className: "rounded-sm border border-border-subtle px-3 py-1.5 text-sm", children: "Cancel" }), _jsx("button", { type: "submit", form: "edit-collection-form", className: "rounded-sm bg-accent-primary px-3 py-1.5 text-sm text-text-on-accent hover:bg-accent-primary/90", children: "Save Changes" })] })] }));
}
//# sourceMappingURL=EditCollectionModal.js.map