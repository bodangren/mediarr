'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { getAllQualities, formatQuality, sortQualitiesByRank, } from '@/types/qualityProfile';
export function AddProfileModal({ isOpen, onClose, onSave, editProfile, customFormatScores = [], isLoading = false, }) {
    const [name, setName] = useState('');
    const [selectedQualities, setSelectedQualities] = useState(new Set());
    const [cutoffQuality, setCutoffQuality] = useState('');
    const [languageProfileId, setLanguageProfileId] = useState(undefined);
    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            if (editProfile) {
                setName(editProfile.name);
                const qualitySet = new Set(editProfile.qualities.map(q => formatQuality(q)));
                setSelectedQualities(qualitySet);
                const cutoff = editProfile.qualities.find(q => q.id === editProfile.cutoffId);
                setCutoffQuality(cutoff ? formatQuality(cutoff) : '');
                setLanguageProfileId(editProfile.languageProfileId);
            }
            else {
                // Default: select all qualities, set cutoff to highest quality
                const allQualities = sortQualitiesByRank(getAllQualities());
                const qualitySet = new Set(allQualities.map(formatQuality));
                setSelectedQualities(qualitySet);
                if (allQualities.length > 0) {
                    setCutoffQuality(formatQuality(allQualities[0]));
                }
                setName('');
                setLanguageProfileId(undefined);
            }
        }
    }, [isOpen, editProfile]);
    const handleQualityToggle = (quality) => {
        setSelectedQualities(current => {
            const next = new Set(current);
            if (next.has(quality)) {
                next.delete(quality);
                // If we removed the cutoff, update it to the next highest
                if (quality === cutoffQuality && next.size > 0) {
                    const sorted = sortQualitiesByRank(Array.from(next).map(q => {
                        const [source, resolution] = q.split('-');
                        return { source, resolution };
                    }));
                    setCutoffQuality(formatQuality(sorted[0]));
                }
            }
            else {
                next.add(quality);
            }
            return next;
        });
    };
    const handleSave = () => {
        if (!name.trim() || selectedQualities.size === 0 || !cutoffQuality) {
            return;
        }
        const qualities = Array.from(selectedQualities).map(q => {
            const [source, resolution] = q.split('-');
            return { source, resolution };
        });
        // Find the index of cutoff quality in the sorted list
        const sortedQualities = sortQualitiesByRank(qualities);
        const cutoffIndex = sortedQualities.findIndex(q => formatQuality(q) === cutoffQuality);
        onSave({
            name: name.trim(),
            cutoffId: cutoffIndex >= 0 ? cutoffIndex : 0,
            qualities,
            languageProfileId,
        });
    };
    const allQualities = sortQualitiesByRank(getAllQualities());
    const selectedQualitiesList = sortQualitiesByRank(Array.from(selectedQualities).map(q => {
        const [source, resolution] = q.split('-');
        return { source, resolution };
    }));
    const canSave = name.trim() !== '' && selectedQualities.size > 0 && cutoffQuality !== '';
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: editProfile ? 'Edit Quality Profile' : 'Add Quality Profile', onClose: onClose, children: [_jsx(ModalHeader, { title: editProfile ? 'Edit Quality Profile' : 'Add Quality Profile', onClose: onClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { htmlFor: "profile-name", className: "block text-sm font-medium text-text-primary", children: ["Profile Name ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx("input", { id: "profile-name", type: "text", className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", placeholder: "e.g., HD - 1080p/720p", value: name, onChange: e => setName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "language-profile", className: "block text-sm font-medium text-text-primary", children: "Language Profile" }), _jsxs("select", { id: "language-profile", className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", value: languageProfileId ?? '', onChange: e => setLanguageProfileId(e.target.value ? Number.parseInt(e.target.value, 10) : undefined), children: [_jsx("option", { value: "", children: "Any Language" }), _jsx("option", { value: "1", children: "English" }), _jsx("option", { value: "2", children: "Spanish" }), _jsx("option", { value: "3", children: "French" }), _jsx("option", { value: "4", children: "German" })] }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Optional: Restrict downloads to a specific language profile." })] }), editProfile && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary", children: "Custom Format Scores" }), customFormatScores.length === 0 ? (_jsx("p", { className: "mt-1 text-xs text-text-muted", children: "No custom format scores assigned." })) : (_jsx("div", { className: "mt-2 space-y-1 rounded-sm border border-border-subtle bg-surface-0 p-3", children: customFormatScores.map((item) => (_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-text-secondary", children: item.name }), _jsx("span", { className: item.score >= 0 ? 'font-medium text-accent-primary' : 'font-medium text-accent-danger', children: item.score >= 0 ? `+${item.score}` : String(item.score) })] }, item.name))) }))] })), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-text-primary", children: ["Allowed Qualities ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx("p", { className: "mb-2 text-xs text-text-muted", children: "Select the quality levels allowed in this profile. Drag to set download priority." }), _jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-0 p-3", children: selectedQualitiesList.length === 0 ? (_jsx("p", { className: "text-sm text-text-muted", children: "No qualities selected. Select from the list below." })) : (_jsx("div", { className: "space-y-1", children: selectedQualitiesList.map((quality) => {
                                            const key = formatQuality(quality);
                                            const isCutoff = cutoffQuality === key;
                                            return (_jsxs("div", { className: `flex items-center justify-between rounded-sm border border-border-subtle px-3 py-1.5 text-sm ${isCutoff ? 'border-accent-primary bg-accent-primary/10' : ''}`, children: [_jsx("span", { children: formatQuality(quality) }), isCutoff ? _jsx("span", { className: "text-xs font-semibold text-accent-primary", children: "Cutoff" }) : null] }, key));
                                        }) })) })] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "cutoff-quality", className: "block text-sm font-medium text-text-primary", children: ["Cutoff Quality ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx("p", { className: "mb-2 text-xs text-text-muted", children: "Once a file at this quality is downloaded, lower quality files will not be downloaded." }), _jsx("select", { id: "cutoff-quality", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", value: cutoffQuality, onChange: e => setCutoffQuality(e.target.value), disabled: selectedQualities.size === 0, children: selectedQualitiesList.map((quality) => (_jsx("option", { value: formatQuality(quality), children: formatQuality(quality) }, formatQuality(quality)))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary", children: "Available Qualities" }), _jsx("p", { className: "mb-2 text-xs text-text-muted", children: "Click to add or remove qualities from the profile." }), _jsx("div", { className: "grid gap-2 md:grid-cols-2", children: allQualities.map(quality => {
                                        const key = formatQuality(quality);
                                        const isSelected = selectedQualities.has(key);
                                        return (_jsx("button", { type: "button", onClick: () => handleQualityToggle(key), className: `rounded-sm border px-3 py-2 text-sm text-left transition ${isSelected
                                                ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                                                : 'border-border-subtle bg-surface-1 text-text-secondary hover:bg-surface-2'}`, children: formatQuality(quality) }, key));
                                    }) })] }), !canSave && (_jsx(Alert, { variant: "warning", children: "Please provide a profile name, select at least one quality, and set a cutoff quality." }))] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: isLoading, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSave, disabled: !canSave || isLoading, children: isLoading ? 'Saving...' : editProfile ? 'Save Changes' : 'Add Profile' })] })] }));
}
//# sourceMappingURL=AddProfileModal.js.map