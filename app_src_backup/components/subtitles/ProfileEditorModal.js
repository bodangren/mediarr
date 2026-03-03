'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { LanguageSelector } from './LanguageSelector';
import { LanguageSettingRow } from './LanguageSettingRow';
import { getLanguageName } from '@/lib/constants/languages';
function getInitialLanguages(profile) {
    if (profile?.languages) {
        return [...profile.languages];
    }
    return [];
}
function getInitialCutoff(profile) {
    return profile?.cutoff ?? '';
}
function getInitialUpgradeAllowed(profile) {
    return profile?.upgradeAllowed ?? false;
}
export function ProfileEditorModal({ isOpen, onClose, onSave, profile, isLoading = false, }) {
    const [name, setName] = useState('');
    const [languages, setLanguages] = useState([]);
    const [cutoff, setCutoff] = useState('');
    const [upgradeAllowed, setUpgradeAllowed] = useState(false);
    const [mustContain, setMustContain] = useState('');
    const [mustNotContain, setMustNotContain] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [nameError, setNameError] = useState('');
    const [languagesError, setLanguagesError] = useState('');
    const [cutoffError, setCutoffError] = useState('');
    // Initialize form when profile changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setName(profile?.name ?? '');
            setLanguages(getInitialLanguages(profile));
            setCutoff(getInitialCutoff(profile));
            setUpgradeAllowed(getInitialUpgradeAllowed(profile));
            setMustContain(profile?.mustContain?.join(', ') ?? '');
            setMustNotContain(profile?.mustNotContain?.join(', ') ?? '');
            setSelectedLanguage('');
            setNameError('');
            setLanguagesError('');
            setCutoffError('');
        }
    }, [isOpen, profile]);
    const getSelectedLanguageCodes = () => languages.map(lang => lang.languageCode);
    const handleAddLanguage = () => {
        if (!selectedLanguage || getSelectedLanguageCodes().includes(selectedLanguage)) {
            return;
        }
        const newLanguage = {
            languageCode: selectedLanguage,
            isForced: false,
            isHi: false,
            audioExclude: false,
            score: 0,
        };
        setLanguages([...languages, newLanguage]);
        setSelectedLanguage('');
        // If this is the first language and cutoff is empty, set it
        if (languages.length === 0 && !cutoff) {
            setCutoff(selectedLanguage);
        }
    };
    const handleLanguageChange = (index, setting) => {
        const newLanguages = [...languages];
        newLanguages[index] = setting;
        setLanguages(newLanguages);
    };
    const handleRemoveLanguage = (index) => {
        const removedLanguage = languages[index];
        const newLanguages = languages.filter((_, i) => i !== index);
        setLanguages(newLanguages);
        // If cutoff was set to the removed language, clear it or set to first remaining
        if (cutoff === removedLanguage.languageCode) {
            setCutoff(newLanguages.length > 0 ? newLanguages[0].languageCode : '');
        }
    };
    const validateForm = () => {
        let isValid = true;
        if (!name.trim()) {
            setNameError('Profile name is required');
            isValid = false;
        }
        else {
            setNameError('');
        }
        if (languages.length === 0) {
            setLanguagesError('At least one language is required');
            isValid = false;
        }
        else {
            setLanguagesError('');
        }
        if (cutoff && !getSelectedLanguageCodes().includes(cutoff)) {
            setCutoffError('Cutoff must be one of the selected languages');
            isValid = false;
        }
        else {
            setCutoffError('');
        }
        return isValid;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        const input = {
            name: name.trim(),
            languages,
            cutoff: cutoff || undefined,
            upgradeAllowed,
        };
        await onSave(input);
    };
    const isEditMode = Boolean(profile);
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: isEditMode ? 'Edit Language Profile' : 'Add Language Profile', onClose: onClose, children: [_jsx(ModalHeader, { title: isEditMode ? 'Edit Language Profile' : 'Add Language Profile', onClose: onClose }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(ModalBody, { className: "space-y-5", children: [_jsxs("div", { children: [_jsxs("label", { htmlFor: "profile-name", className: "mb-1 block text-sm font-medium text-text-primary", children: ["Profile Name ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx("input", { id: "profile-name", type: "text", value: name, onChange: e => {
                                            setName(e.target.value);
                                            if (nameError)
                                                setNameError('');
                                        }, disabled: isLoading, className: `w-full rounded-md border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50 ${nameError ? 'border-accent-danger' : 'border-border-subtle'}`, placeholder: "e.g., English, Spanish, French", "aria-invalid": Boolean(nameError), "aria-describedby": nameError ? 'name-error' : undefined }), nameError && (_jsx("p", { id: "name-error", className: "mt-1 text-xs text-accent-danger", children: nameError }))] }), _jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("label", { className: "text-sm font-medium text-text-primary", children: ["Languages ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx(LanguageSelector, { value: selectedLanguage, onChange: setSelectedLanguage, exclude: getSelectedLanguageCodes(), label: "Add Language", disabled: isLoading })] }), _jsx(Button, { type: "button", variant: "secondary", onClick: handleAddLanguage, disabled: !selectedLanguage || isLoading, className: "mb-3", children: "Add Language" }), languagesError && (_jsx("p", { className: "mb-2 text-xs text-accent-danger", children: languagesError })), languages.length > 0 && (_jsx("div", { className: "space-y-2", children: languages.map((language, index) => (_jsx(LanguageSettingRow, { setting: language, onChange: setting => handleLanguageChange(index, setting), onRemove: () => handleRemoveLanguage(index), disabled: isLoading }, `${language.languageCode}-${index}`))) })), languages.length === 0 && (_jsx("p", { className: "text-sm text-text-muted", children: "No languages added yet. Select a language above and click \"Add Language\"." }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "cutoff", className: "mb-1 block text-sm font-medium text-text-primary", children: "Cutoff Language" }), _jsxs("select", { id: "cutoff", value: cutoff, onChange: e => {
                                            setCutoff(e.target.value);
                                            if (cutoffError)
                                                setCutoffError('');
                                        }, disabled: languages.length === 0 || isLoading, className: `w-full rounded-md border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50 ${cutoffError ? 'border-accent-danger' : 'border-border-subtle'}`, "aria-invalid": Boolean(cutoffError), "aria-describedby": cutoffError ? 'cutoff-error' : undefined, children: [_jsx("option", { value: "", children: "No cutoff" }), languages.map(lang => (_jsxs("option", { value: lang.languageCode, children: [getLanguageName(lang.languageCode), " (", lang.languageCode, ")"] }, lang.languageCode)))] }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Subtitles with quality lower than this cutoff will be upgraded automatically if enabled." }), cutoffError && (_jsx("p", { id: "cutoff-error", className: "mt-1 text-xs text-accent-danger", children: cutoffError }))] }), _jsxs("div", { children: [_jsxs("label", { className: "flex items-center gap-2 text-sm font-medium text-text-primary", children: [_jsx("input", { type: "checkbox", checked: upgradeAllowed, onChange: e => setUpgradeAllowed(e.target.checked), disabled: isLoading, className: "h-4 w-4 rounded border-border-subtle bg-surface-2 text-accent-primary focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50" }), "Allow Upgrades"] }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Automatically download better quality subtitles when available, respecting the cutoff language." })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "must-contain", className: "mb-1 block text-sm font-medium text-text-primary", children: "Must Contain" }), _jsx("input", { id: "must-contain", type: "text", value: mustContain, onChange: e => setMustContain(e.target.value), disabled: isLoading, className: "w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50", placeholder: "e.g., BluRay, REMUX (comma-separated)" }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Comma-separated list of release tags that subtitles must contain to be accepted." })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "must-not-contain", className: "mb-1 block text-sm font-medium text-text-primary", children: "Must Not Contain" }), _jsx("input", { id: "must-not-contain", type: "text", value: mustNotContain, onChange: e => setMustNotContain(e.target.value), disabled: isLoading, className: "w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50", placeholder: "e.g., HC, HI (comma-separated)" }), _jsx("p", { className: "mt-1 text-xs text-text-text-muted", children: "Comma-separated list of release tags that subtitles must not contain to be accepted." })] })] }), _jsxs(ModalFooter, { children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onClose, disabled: isLoading, children: "Cancel" }), _jsx(Button, { type: "submit", variant: "primary", disabled: isLoading, children: isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Profile' })] })] })] }));
}
//# sourceMappingURL=ProfileEditorModal.js.map