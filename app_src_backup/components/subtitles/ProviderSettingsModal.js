'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import {} from '@/lib/api';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { Form, FormGroup, TextInput, PasswordInput } from '@/components/primitives/Form';
import { NumberInput } from '@/components/primitives/SpecialInputs';
import { Switch } from '@/components/primitives/Switch';
import { ProviderTestResult as TestResultDisplay } from './ProviderTestResult';
import { Alert } from '@/components/primitives/Alert';
export function ProviderSettingsModal({ isOpen, onClose, provider, onSave, onTest, onReset, isSaving = false, }) {
    const [settings, setSettings] = useState({});
    const [testResult, setTestResult] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    if (!provider) {
        return null;
    }
    // Initialize settings from provider when modal opens or provider changes
    if (isOpen && provider) {
        const currentSettings = provider.settings ?? {};
        if (JSON.stringify(currentSettings) !== JSON.stringify(settings)) {
            setSettings(currentSettings);
        }
    }
    const handleSave = async () => {
        await onSave(provider.id, settings);
        onClose();
    };
    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await onTest(provider.id);
            setTestResult(result);
        }
        catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : 'Test failed',
            });
        }
        finally {
            setIsTesting(false);
        }
    };
    const handleReset = async () => {
        if (!showResetConfirm) {
            setShowResetConfirm(true);
            return;
        }
        setIsResetting(true);
        try {
            const resetProvider = await onReset(provider.id);
            setSettings(resetProvider.settings ?? {});
            setShowResetConfirm(false);
        }
        catch (error) {
            console.error('Failed to reset provider:', error);
        }
        finally {
            setIsResetting(false);
        }
    };
    const handleInputChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };
    const renderProviderFields = () => {
        switch (provider.type.toLowerCase()) {
            case 'opensubtitles':
                return (_jsxs(_Fragment, { children: [_jsx(FormGroup, { label: "Username", htmlFor: "username", children: _jsx(TextInput, { id: "username", value: settings.username ?? '', onChange: value => handleInputChange('username', value), placeholder: "OpenSubtitles username" }) }), _jsx(FormGroup, { label: "Password", htmlFor: "password", children: _jsx(PasswordInput, { id: "password", value: settings.password ?? '', onChange: value => handleInputChange('password', value), placeholder: "OpenSubtitles password" }) }), _jsx(FormGroup, { label: "API Key (Optional)", htmlFor: "apiKey", hint: "Not required for all users", children: _jsx(PasswordInput, { id: "apiKey", value: settings.apiKey ?? '', onChange: value => handleInputChange('apiKey', value), placeholder: "OpenSubtitles API key" }) })] }));
            case 'subscene':
            case 'podnapisi':
                return (_jsx(Alert, { variant: "info", children: "This provider does not require any configuration. Simply enable it to use." }));
            case 'addic7ed':
                return (_jsxs(_Fragment, { children: [_jsx(FormGroup, { label: "Username", htmlFor: "username", children: _jsx(TextInput, { id: "username", value: settings.username ?? '', onChange: value => handleInputChange('username', value), placeholder: "Addic7ed username" }) }), _jsx(FormGroup, { label: "Password", htmlFor: "password", children: _jsx(PasswordInput, { id: "password", value: settings.password ?? '', onChange: value => handleInputChange('password', value), placeholder: "Addic7ed password" }) })] }));
            case 'generic':
            default:
                return (_jsxs(_Fragment, { children: [_jsx(FormGroup, { label: "API Key", htmlFor: "apiKey", hint: "Required for most generic providers", children: _jsx(PasswordInput, { id: "apiKey", value: settings.apiKey ?? '', onChange: value => handleInputChange('apiKey', value), placeholder: "Provider API key" }) }), _jsx(FormGroup, { label: "Timeout (seconds)", htmlFor: "timeout", hint: "Connection timeout duration", children: _jsx(NumberInput, { id: "timeout", value: settings.timeout ?? 30, onChange: value => handleInputChange('timeout', value), min: 5, max: 120 }) }), _jsx(FormGroup, { label: "Max Results", htmlFor: "maxResults", hint: "Maximum search results to return", children: _jsx(NumberInput, { id: "maxResults", value: settings.maxResults ?? 50, onChange: value => handleInputChange('maxResults', value), min: 1, max: 200 }) }), _jsx(FormGroup, { label: "Use SSL", htmlFor: "useSSL", hint: "Enable HTTPS connections", children: _jsx(Switch, { id: "useSSL", checked: settings.useSSL ?? true, onChange: checked => handleInputChange('useSSL', checked), label: "Enable SSL" }) })] }));
        }
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: `Configure ${provider.name} provider`, onClose: onClose, maxWidthClassName: "max-w-lg", children: [_jsx(ModalHeader, { title: `Configure ${provider.name}`, onClose: onClose, actions: _jsx(Button, { variant: "secondary", onClick: handleTest, disabled: isTesting || isSaving || isResetting, children: "Test" }) }), _jsxs(ModalBody, { children: [_jsx(Form, { children: _jsx("div", { className: "space-y-4", children: renderProviderFields() }) }), _jsx(TestResultDisplay, { result: testResult, isTesting: isTesting })] }), _jsx(ModalFooter, { children: _jsxs("div", { className: "flex items-center justify-between gap-4 w-full", children: [_jsx(Button, { variant: "danger", onClick: handleReset, disabled: isResetting || isSaving || isTesting, children: isResetting ? 'Resetting...' : showResetConfirm ? 'Confirm Reset' : 'Reset' }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: isSaving || isResetting || isTesting, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSave, disabled: isSaving || isResetting || isTesting, children: isSaving ? 'Saving...' : 'Save' })] })] }) })] }));
}
//# sourceMappingURL=ProviderSettingsModal.js.map