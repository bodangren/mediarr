import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditIndexerModal } from './EditIndexerModal';
function buildIndexer(overrides = {}) {
    return {
        id: 12,
        name: 'Indexer Beta',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: JSON.stringify({ url: 'https://beta.example', apiKey: 'beta-key' }),
        protocol: 'torrent',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
        ...overrides,
    };
}
describe('EditIndexerModal', () => {
    it('pre-populates indexer values and protocol settings when opened', () => {
        render(_jsx(EditIndexerModal, { isOpen: true, indexer: buildIndexer({
                id: 11,
                name: 'Indexer Alpha',
                settings: JSON.stringify({ url: 'https://alpha.example', apiKey: 'alpha-key' }),
                priority: 20,
            }), onClose: () => { }, onSave: () => { } }));
        const modal = screen.getByRole('dialog', { name: 'Edit indexer' });
        expect(within(modal).getByDisplayValue('Indexer Alpha')).toBeInTheDocument();
        expect(within(modal).getByDisplayValue('20')).toBeInTheDocument();
        expect(within(modal).getByDisplayValue('https://alpha.example')).toBeInTheDocument();
        expect(within(modal).getByDisplayValue('alpha-key')).toBeInTheDocument();
    });
    it('validates required fields and submits normalized payload when valid', async () => {
        const onSave = vi.fn();
        render(_jsx(EditIndexerModal, { isOpen: true, indexer: buildIndexer(), onClose: () => { }, onSave: onSave }));
        const modal = screen.getByRole('dialog', { name: 'Edit indexer' });
        fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: '' } });
        fireEvent.click(within(modal).getByRole('button', { name: 'Save Indexer' }));
        expect(await within(modal).findByRole('alert')).toHaveTextContent('Name is required');
        expect(onSave).not.toHaveBeenCalled();
        fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Indexer Beta v2' } });
        fireEvent.change(within(modal).getByLabelText('Indexer URL'), { target: { value: 'https://beta-v2.example' } });
        fireEvent.click(within(modal).getByRole('button', { name: 'Save Indexer' }));
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith({
                id: 12,
                name: 'Indexer Beta v2',
                implementation: 'Torznab',
                configContract: 'TorznabSettings',
                protocol: 'torrent',
                enabled: true,
                supportsRss: true,
                supportsSearch: true,
                priority: 25,
                settings: {
                    url: 'https://beta-v2.example',
                    apiKey: 'beta-key',
                },
            });
        });
    });
    it('switches protocol to usenet and requires host before submit', async () => {
        const onSave = vi.fn();
        render(_jsx(EditIndexerModal, { isOpen: true, indexer: buildIndexer(), onClose: () => { }, onSave: onSave }));
        const modal = screen.getByRole('dialog', { name: 'Edit indexer' });
        fireEvent.change(within(modal).getByRole('combobox', { name: 'Protocol' }), { target: { value: 'usenet' } });
        expect(within(modal).queryByLabelText('Indexer URL')).not.toBeInTheDocument();
        expect(within(modal).getByLabelText('Host')).toBeInTheDocument();
        fireEvent.click(within(modal).getByRole('button', { name: 'Save Indexer' }));
        expect(await within(modal).findByRole('alert')).toHaveTextContent('Host is required');
        fireEvent.change(within(modal).getByLabelText('Host'), { target: { value: 'news.beta.example' } });
        fireEvent.click(within(modal).getByRole('button', { name: 'Save Indexer' }));
        await waitFor(() => {
            expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({
                configContract: 'NewznabSettings',
                protocol: 'usenet',
                settings: expect.objectContaining({
                    host: 'news.beta.example',
                    apiKey: 'beta-key',
                }),
            }));
        });
    });
    it('parses custom contract schema and keeps it while switching protocol', async () => {
        const onSave = vi.fn();
        render(_jsx(EditIndexerModal, { isOpen: true, indexer: buildIndexer({
                configContract: JSON.stringify([
                    { name: 'seedRequirement', label: 'Minimum Seeders', type: 'number', required: true },
                    { name: 'bypassCloudflare', label: 'Bypass Cloudflare', type: 'boolean', required: true },
                    { name: 'captchaToken', label: 'Captcha Token', type: 'text', required: false },
                ]),
                settings: 'invalid-json',
            }), onClose: () => { }, onSave: onSave }));
        const modal = screen.getByRole('dialog', { name: 'Edit indexer' });
        const seedersField = within(modal).getByRole('spinbutton', { name: 'edit-indexer-seedRequirement' });
        fireEvent.change(seedersField, { target: { value: '18' } });
        fireEvent.click(within(modal).getByRole('checkbox', { name: 'Bypass Cloudflare' }));
        fireEvent.change(within(modal).getByRole('combobox', { name: 'Protocol' }), { target: { value: 'usenet' } });
        expect(within(modal).getByRole('spinbutton', { name: 'edit-indexer-seedRequirement' })).toBeInTheDocument();
        fireEvent.click(within(modal).getByRole('button', { name: 'Save Indexer' }));
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                protocol: 'usenet',
                settings: {
                    seedRequirement: 18,
                    bypassCloudflare: true,
                    captchaToken: '',
                },
            }));
        });
    });
    it('preserves Cardigann definition settings during edit/save round-trip', async () => {
        const onSave = vi.fn();
        render(_jsx(EditIndexerModal, { isOpen: true, indexer: buildIndexer({
                implementation: 'Cardigann',
                configContract: 'CardigannSettings',
                settings: JSON.stringify({
                    definitionId: '1337x',
                    sitelink: 'https://1337x.to',
                    cookie: 'session=abc',
                }),
            }), onClose: () => { }, onSave: onSave }));
        const modal = screen.getByRole('dialog', { name: 'Edit indexer' });
        fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: '1337x Mirror' } });
        fireEvent.click(within(modal).getByRole('button', { name: 'Save Indexer' }));
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                implementation: 'Cardigann',
                configContract: 'CardigannSettings',
                settings: expect.objectContaining({
                    definitionId: '1337x',
                    sitelink: 'https://1337x.to',
                    cookie: 'session=abc',
                }),
            }));
        });
    });
});
//# sourceMappingURL=EditIndexerModal.test.js.map