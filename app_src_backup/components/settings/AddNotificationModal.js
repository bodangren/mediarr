'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/primitives/Alert';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { getApiClients } from '@/lib/api/client';
import { getNotificationTypeLabel, getNotificationTriggerLabel, } from '@/types/notification';
const NOTIFICATION_TYPES = [
    'Discord',
    'Telegram',
    'Email',
    'Slack',
    'Webhook',
    'Pushover',
];
const TRIGGER_OPTIONS = [
    'OnGrab',
    'OnDownload',
    'OnImport',
    'OnUpgrade',
    'OnHealthIssue',
    'OnDelete',
];
function getWebhookUrl(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Discord' || notification.type === 'Slack' || notification.type === 'Webhook') {
        return notification.webhookUrl;
    }
    return '';
}
function getBotToken(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Telegram') {
        return notification.botToken;
    }
    return '';
}
function getChatId(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Telegram') {
        return notification.chatId;
    }
    return '';
}
function getSmtpServer(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Email') {
        return notification.smtpServer;
    }
    return '';
}
function getSmtpPort(notification) {
    if (!notification)
        return '587';
    if (notification.type === 'Email') {
        return notification.smtpPort.toString();
    }
    return '587';
}
function getSmtpUser(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Email') {
        return notification.smtpUser;
    }
    return '';
}
function getSmtpPassword(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Email') {
        return notification.smtpPassword;
    }
    return '';
}
function getFromAddress(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Email') {
        return notification.fromAddress;
    }
    return '';
}
function getToAddress(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Email') {
        return notification.toAddress;
    }
    return '';
}
function getMethod(notification) {
    if (!notification)
        return 'POST';
    if (notification.type === 'Webhook') {
        return notification.method;
    }
    return 'POST';
}
function getHeaders(notification) {
    if (!notification)
        return '';
    if (notification.type === 'Webhook' && notification.headers) {
        return JSON.stringify(notification.headers, null, 2);
    }
    return '';
}
export function AddNotificationModal({ isOpen, onClose, notificationToEdit }) {
    const queryClient = useQueryClient();
    const notificationsApi = getApiClients().notificationsApi;
    const isEditing = Boolean(notificationToEdit);
    // Form state
    const [name, setName] = useState(notificationToEdit?.name ?? '');
    const [type, setType] = useState(notificationToEdit?.type ?? 'Discord');
    const [enabled, setEnabled] = useState(notificationToEdit?.enabled ?? true);
    const [triggers, setTriggers] = useState(notificationToEdit?.triggers ?? ['OnGrab', 'OnDownload']);
    // Type-specific fields
    const [webhookUrl, setWebhookUrl] = useState(getWebhookUrl(notificationToEdit));
    const [botToken, setBotToken] = useState(getBotToken(notificationToEdit));
    const [chatId, setChatId] = useState(getChatId(notificationToEdit));
    const [smtpServer, setSmtpServer] = useState(getSmtpServer(notificationToEdit));
    const [smtpPort, setSmtpPort] = useState(getSmtpPort(notificationToEdit));
    const [smtpUser, setSmtpUser] = useState(getSmtpUser(notificationToEdit));
    const [smtpPassword, setSmtpPassword] = useState(getSmtpPassword(notificationToEdit));
    const [fromAddress, setFromAddress] = useState(getFromAddress(notificationToEdit));
    const [toAddress, setToAddress] = useState(getToAddress(notificationToEdit));
    const [method, setMethod] = useState(getMethod(notificationToEdit));
    const [headers, setHeaders] = useState(getHeaders(notificationToEdit));
    const [testResult, setTestResult] = useState(null);
    const createMutation = useMutation({
        mutationFn: (data) => notificationsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            handleClose();
        },
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => notificationsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            handleClose();
        },
    });
    const testMutation = useMutation({
        mutationFn: (data) => notificationsApi.testDraft(data),
        onSuccess: result => {
            setTestResult(result);
        },
    });
    const handleClose = () => {
        resetForm();
        setTestResult(null);
        onClose();
    };
    const resetForm = () => {
        setName('');
        setType('Discord');
        setEnabled(true);
        setTriggers(['OnGrab', 'OnDownload']);
        setWebhookUrl('');
        setBotToken('');
        setChatId('');
        setSmtpServer('');
        setSmtpPort('587');
        setSmtpUser('');
        setSmtpPassword('');
        setFromAddress('');
        setToAddress('');
        setMethod('POST');
        setHeaders('');
    };
    const handleTypeChange = (newType) => {
        setType(newType);
        // Reset type-specific fields when switching types
        setWebhookUrl('');
        setBotToken('');
        setChatId('');
        setSmtpServer('');
        setSmtpPort('587');
        setSmtpUser('');
        setSmtpPassword('');
        setFromAddress('');
        setToAddress('');
        setMethod('POST');
        setHeaders('');
    };
    const handleTriggerToggle = (trigger) => {
        setTriggers(current => current.includes(trigger) ? current.filter(t => t !== trigger) : [...current, trigger]);
    };
    const handleTest = () => {
        const data = {
            name,
            type,
            enabled,
            triggers,
            ...(type === 'Discord' || type === 'Slack' || type === 'Webhook' ? { webhookUrl } : {}),
            ...(type === 'Telegram' ? { botToken, chatId } : {}),
            ...(type === 'Email' ? { smtpServer, smtpPort: Number.parseInt(smtpPort, 10) || 587, smtpUser, smtpPassword, fromAddress, toAddress } : {}),
            ...(type === 'Webhook' ? { method, headers: headers ? JSON.parse(headers) : undefined } : {}),
        };
        setTestResult(null);
        testMutation.mutate(data);
    };
    const handleSubmit = () => {
        const data = {
            name,
            type,
            enabled,
            triggers,
            ...(type === 'Discord' || type === 'Slack' || type === 'Webhook' ? { webhookUrl } : {}),
            ...(type === 'Telegram' ? { botToken, chatId } : {}),
            ...(type === 'Email' ? { smtpServer, smtpPort: Number.parseInt(smtpPort, 10) || 587, smtpUser, smtpPassword, fromAddress, toAddress } : {}),
            ...(type === 'Webhook' ? { method, headers: headers ? JSON.parse(headers) : undefined } : {}),
        };
        if (isEditing && notificationToEdit) {
            updateMutation.mutate({ id: notificationToEdit.id, data });
        }
        else {
            createMutation.mutate(data);
        }
    };
    const isFormValid = () => {
        if (!name.trim())
            return false;
        // Type-specific validation
        if (type === 'Discord' || type === 'Slack' || type === 'Webhook') {
            if (!webhookUrl.trim())
                return false;
        }
        if (type === 'Telegram') {
            if (!botToken.trim() || !chatId.trim())
                return false;
        }
        if (type === 'Email') {
            if (!smtpServer.trim() || !smtpUser.trim() || !fromAddress.trim() || !toAddress.trim())
                return false;
        }
        return true;
    };
    const renderTypeSpecificFields = () => {
        switch (type) {
            case 'Discord':
            case 'Slack':
                return (_jsx("div", { className: "space-y-3", children: _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: type === 'Slack' ? 'Slack Webhook URL' : 'Webhook URL' }), _jsx("input", { type: "url", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", placeholder: type === 'Slack' ? 'https://hooks.slack.com/services/...' : 'https://discord.com/api/webhooks/...', value: webhookUrl, onChange: e => setWebhookUrl(e.target.value) })] }) }));
            case 'Telegram':
                return (_jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Bot Token" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", value: botToken, onChange: e => setBotToken(e.target.value) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Chat ID" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", placeholder: "123456789 or @channelname", value: chatId, onChange: e => setChatId(e.target.value) })] })] }));
            case 'Email':
                return (_jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "SMTP Server" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "smtp.gmail.com", value: smtpServer, onChange: e => setSmtpServer(e.target.value) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "SMTP Port" }), _jsx("input", { type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "587", value: smtpPort, onChange: e => setSmtpPort(e.target.value) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "SMTP Username" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "username@gmail.com", value: smtpUser, onChange: e => setSmtpUser(e.target.value) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "SMTP Password" }), _jsx("input", { type: "password", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "Your password or app password", value: smtpPassword, onChange: e => setSmtpPassword(e.target.value) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "From Address" }), _jsx("input", { type: "email", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "mediarr@example.com", value: fromAddress, onChange: e => setFromAddress(e.target.value) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "To Address" }), _jsx("input", { type: "email", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "recipient@example.com", value: toAddress, onChange: e => setToAddress(e.target.value) })] })] }));
            case 'Webhook':
                return (_jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Webhook URL" }), _jsx("input", { type: "url", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", placeholder: "https://example.com/webhook", value: webhookUrl, onChange: e => setWebhookUrl(e.target.value) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Method" }), _jsxs("select", { className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", value: method, onChange: e => setMethod(e.target.value), children: [_jsx("option", { value: "POST", children: "POST" }), _jsx("option", { value: "GET", children: "GET" }), _jsx("option", { value: "PUT", children: "PUT" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Headers (JSON)" }), _jsx("textarea", { className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", rows: 4, placeholder: '{"Authorization": "Bearer token"}', value: headers, onChange: e => setHeaders(e.target.value) })] })] }));
            case 'Pushover':
                return (_jsxs("div", { className: "space-y-3", children: [_jsx(Alert, { variant: "info", children: _jsx("p", { children: "Pushover configuration requires your application API key and user key." }) }), _jsx("p", { className: "text-sm text-text-muted", children: "Implementation pending backend support." })] }));
            default:
                return null;
        }
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: isEditing ? 'Edit Notification' : 'Add Notification', onClose: handleClose, maxWidthClassName: "max-w-2xl", children: [_jsx(ModalHeader, { title: isEditing ? 'Edit Notification' : 'Add Notification', actions: _jsx(Button, { variant: "secondary", onClick: handleTest, disabled: !isFormValid() || testMutation.isPending, children: testMutation.isPending ? 'Testing...' : 'Test' }) }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [testResult && (_jsx(Alert, { variant: testResult.success ? 'success' : 'danger', children: _jsx("p", { children: testResult.message }) })), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Name" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "e.g., Discord Notifications", value: name, onChange: e => setName(e.target.value) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Type" }), _jsx("select", { className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", value: type, onChange: e => handleTypeChange(e.target.value), disabled: isEditing, children: NOTIFICATION_TYPES.map(t => (_jsx("option", { value: t, children: getNotificationTypeLabel(t) }, t))) })] }), renderTypeSpecificFields(), _jsxs("div", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Triggers" }), _jsx("div", { className: "grid grid-cols-2 gap-2 md:grid-cols-3", children: TRIGGER_OPTIONS.map(trigger => (_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: triggers.includes(trigger), onChange: () => handleTriggerToggle(trigger) }), getNotificationTriggerLabel(trigger)] }, trigger))) })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: enabled, onChange: e => setEnabled(e.target.checked) }), "Enabled"] })] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: handleClose, disabled: createMutation.isPending || updateMutation.isPending, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSubmit, disabled: !isFormValid() || createMutation.isPending || updateMutation.isPending, children: createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Add' })] })] }));
}
//# sourceMappingURL=AddNotificationModal.js.map