import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@/components/primitives/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Check } from 'lucide-react';
export function CalendarOptionsModal({ isOpen, onClose, options, onOptionsChange, }) {
    const handleToggle = (key) => {
        onOptionsChange({
            ...options,
            [key]: !options[key],
        });
    };
    const handleSave = () => {
        onClose();
    };
    const handleReset = () => {
        onOptionsChange({
            showDayNumbers: true,
            showWeekNumbers: false,
            showMonitored: true,
            showUnmonitored: true,
            showCinemaReleases: true,
            showDigitalReleases: true,
            showPhysicalReleases: true,
        });
    };
    return (_jsxs(Modal, { isOpen: isOpen, onClose: onClose, ariaLabel: "Calendar Options", children: [_jsx(ModalHeader, { title: "Calendar Options", onClose: onClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-text-primary", children: "Display" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("button", { type: "button", onClick: () => handleToggle('showDayNumbers'), className: "flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2", children: [_jsx("span", { className: "text-sm text-text-primary", children: "Show Day Numbers" }), options.showDayNumbers && _jsx(Check, { className: "h-4 w-4 text-accent-primary" })] }), _jsxs("button", { type: "button", onClick: () => handleToggle('showWeekNumbers'), className: "flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2", children: [_jsx("span", { className: "text-sm text-text-primary", children: "Show Week Numbers" }), options.showWeekNumbers && _jsx(Check, { className: "h-4 w-4 text-accent-primary" })] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-text-primary", children: "Content Filters" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("button", { type: "button", onClick: () => handleToggle('showMonitored'), className: "flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2", children: [_jsx("span", { className: "text-sm text-text-primary", children: "Show Monitored Items" }), options.showMonitored && _jsx(Check, { className: "h-4 w-4 text-accent-primary" })] }), _jsxs("button", { type: "button", onClick: () => handleToggle('showUnmonitored'), className: "flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2", children: [_jsx("span", { className: "text-sm text-text-primary", children: "Show Unmonitored Items" }), options.showUnmonitored && _jsx(Check, { className: "h-4 w-4 text-accent-primary" })] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-text-primary", children: "Release Types" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("button", { type: "button", onClick: () => handleToggle('showCinemaReleases'), className: "flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2", children: [_jsx("span", { className: "text-sm text-text-primary", children: "Cinema Releases" }), options.showCinemaReleases && _jsx(Check, { className: "h-4 w-4 text-accent-primary" })] }), _jsxs("button", { type: "button", onClick: () => handleToggle('showDigitalReleases'), className: "flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2", children: [_jsx("span", { className: "text-sm text-text-primary", children: "Digital Releases" }), options.showDigitalReleases && _jsx(Check, { className: "h-4 w-4 text-accent-primary" })] }), _jsxs("button", { type: "button", onClick: () => handleToggle('showPhysicalReleases'), className: "flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2", children: [_jsx("span", { className: "text-sm text-text-primary", children: "Physical Releases" }), options.showPhysicalReleases && _jsx(Check, { className: "h-4 w-4 text-accent-primary" })] })] })] })] }) }), _jsx(ModalFooter, { children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx(Button, { variant: "secondary", onClick: handleReset, children: "Reset to Defaults" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSave, children: "Save Changes" })] })] }) })] }));
}
//# sourceMappingURL=CalendarOptionsModal.js.map