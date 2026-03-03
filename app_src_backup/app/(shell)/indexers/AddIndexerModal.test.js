import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddIndexerModal } from './AddIndexerModal';
const presets = [
    {
        id: 'torznab-generic',
        name: 'Generic Torznab',
        description: 'Custom torznab tracker',
        protocol: 'torrent',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        privacy: 'Public',
        fields: [
            { name: 'url', label: 'Indexer URL', type: 'text', required: true },
            { name: 'apiKey', label: 'API Key', type: 'password', required: true },
        ],
    },
    {
        id: 'newznab-generic',
        name: 'Generic Newznab',
        description: 'Custom usenet indexer',
        protocol: 'usenet',
        implementation: 'Torznab',
        configContract: 'NewznabSettings',
        privacy: 'Public',
        fields: [
            { name: 'host', label: 'Host', type: 'text', required: true },
            { name: 'apiKey', label: 'API Key', type: 'password', required: true },
        ],
    },
];
describe('AddIndexerModal', () => {
    it('renders preset choices and switches schema fields when preset changes', () => {
        render(_jsx(AddIndexerModal, { isOpen: true, presets: presets, onClose: () => { }, onCreate: () => { }, onTestConnection: async () => ({ success: true, message: 'ok', hints: [] }) }));
        expect(screen.getByRole('dialog', { name: 'Add Indexer' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Generic Torznab/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Generic Newznab/ })).toBeInTheDocument();
        expect(screen.getByLabelText('Indexer URL')).toBeInTheDocument();
        expect(screen.queryByLabelText('Host')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Generic Newznab/ }));
        expect(screen.getByLabelText('Host')).toBeInTheDocument();
        expect(screen.queryByLabelText('Indexer URL')).not.toBeInTheDocument();
    });
    it('submits payload using selected preset metadata and dynamic settings', async () => {
        const onCreate = vi.fn();
        render(_jsx(AddIndexerModal, { isOpen: true, presets: presets, onClose: () => { }, onCreate: onCreate, onTestConnection: async () => ({ success: true, message: 'ok', hints: [] }) }));
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ninja' } });
        fireEvent.change(screen.getByLabelText('Indexer URL'), { target: { value: 'https://ninja.example' } });
        fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'secret' } });
        fireEvent.change(screen.getByLabelText('Priority'), { target: { value: '35' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add Indexer' }));
        await waitFor(() => {
            expect(onCreate).toHaveBeenCalledWith({
                presetId: 'torznab-generic',
                name: 'Ninja',
                implementation: 'Torznab',
                configContract: 'TorznabSettings',
                protocol: 'torrent',
                enabled: true,
                supportsRss: true,
                supportsSearch: true,
                priority: 35,
                settings: {
                    url: 'https://ninja.example',
                    apiKey: 'secret',
                },
            });
        });
    });
    it('shows validation errors when required fields are missing', async () => {
        const onCreate = vi.fn();
        render(_jsx(AddIndexerModal, { isOpen: true, presets: presets, onClose: () => { }, onCreate: onCreate, onTestConnection: async () => ({ success: true, message: 'ok', hints: [] }) }));
        fireEvent.click(screen.getByRole('button', { name: 'Add Indexer' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Name is required');
        expect(onCreate).not.toHaveBeenCalled();
    });
    it('runs connection test and renders diagnostics', async () => {
        const onTestConnection = vi.fn().mockResolvedValue({
            success: false,
            message: 'HTTP timeout contacting indexer',
            hints: ['Verify API key', 'Check DNS'],
        });
        render(_jsx(AddIndexerModal, { isOpen: true, presets: presets, onClose: () => { }, onCreate: () => { }, onTestConnection: onTestConnection }));
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ninja' } });
        fireEvent.change(screen.getByLabelText('Indexer URL'), { target: { value: 'https://ninja.example' } });
        fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));
        await waitFor(() => {
            expect(onTestConnection).toHaveBeenCalledWith({
                presetId: 'torznab-generic',
                name: 'Ninja',
                implementation: 'Torznab',
                configContract: 'TorznabSettings',
                protocol: 'torrent',
                enabled: true,
                supportsRss: true,
                supportsSearch: true,
                priority: 25,
                settings: {
                    url: 'https://ninja.example',
                    apiKey: 'secret',
                },
            });
        });
        expect(await screen.findByText('HTTP timeout contacting indexer')).toBeInTheDocument();
        expect(screen.getByText('Verify API key')).toBeInTheDocument();
        expect(screen.getByText('Check DNS')).toBeInTheDocument();
    });
    it('supports optional text plus boolean and numeric dynamic fields', async () => {
        const onCreate = vi.fn();
        render(_jsx(AddIndexerModal, { isOpen: true, presets: [
                {
                    id: 'cardigann-custom',
                    name: 'Cardigann Custom',
                    description: 'Custom scraping indexer',
                    protocol: 'torrent',
                    implementation: 'Cardigann',
                    configContract: 'CardigannSettings',
                    privacy: 'Public',
                    fields: [
                        { name: 'seedRequirement', label: 'Minimum Seeders', type: 'number', required: true, defaultValue: 10 },
                        { name: 'bypassCloudflare', label: 'Bypass Cloudflare', type: 'boolean', required: true, defaultValue: false },
                        { name: 'captchaToken', label: 'Captcha Token', type: 'text', required: false },
                    ],
                },
            ], onClose: () => { }, onCreate: onCreate, onTestConnection: async () => ({ success: true, message: 'ok', hints: [] }) }));
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Scrape One' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: 'add-indexer-seedRequirement' }), { target: { value: '22' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'Bypass Cloudflare' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add Indexer' }));
        await waitFor(() => {
            expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
                settings: {
                    seedRequirement: 22,
                    bypassCloudflare: true,
                    captchaToken: '',
                },
            }));
        });
    });
});
//# sourceMappingURL=AddIndexerModal.test.js.map