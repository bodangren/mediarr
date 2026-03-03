import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryFilters } from './HistoryFilters';
describe('HistoryFilters', () => {
    const defaultProps = {
        filters: {},
        onChange: vi.fn(),
        providers: ['OpenSubtitles', 'Subscene'],
        languages: ['en', 'es', 'fr'],
        actions: ['download', 'upgrade', 'manual', 'upload'],
    };
    it('renders all filter controls', () => {
        render(_jsx(HistoryFilters, { ...defaultProps }));
        expect(screen.getByLabelText('Provider')).toBeInTheDocument();
        expect(screen.getByLabelText('Language')).toBeInTheDocument();
        expect(screen.getByLabelText('Action')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
    });
    it('renders provider options', () => {
        render(_jsx(HistoryFilters, { ...defaultProps }));
        const select = screen.getByLabelText('Provider');
        expect(select).toHaveValue('');
        userEvent.selectOptions(select, 'OpenSubtitles');
        expect(select).toHaveValue('OpenSubtitles');
    });
    it('renders language options', () => {
        render(_jsx(HistoryFilters, { ...defaultProps }));
        const select = screen.getByLabelText('Language');
        expect(select).toHaveValue('');
        userEvent.selectOptions(select, 'en');
        expect(select).toHaveValue('en');
    });
    it('renders action options', () => {
        render(_jsx(HistoryFilters, { ...defaultProps }));
        const select = screen.getByLabelText('Action');
        expect(select).toHaveValue('');
        userEvent.selectOptions(select, 'download');
        expect(select).toHaveValue('download');
    });
    it('calls onChange when provider changes', async () => {
        const handleChange = vi.fn();
        render(_jsx(HistoryFilters, { ...defaultProps, onChange: handleChange }));
        const select = screen.getByLabelText('Provider');
        await userEvent.selectOptions(select, 'OpenSubtitles');
        expect(handleChange).toHaveBeenCalledWith({
            provider: 'OpenSubtitles',
            languageCode: undefined,
            action: undefined,
            startDate: undefined,
            endDate: undefined,
        });
    });
    it('calls onChange when language changes', async () => {
        const handleChange = vi.fn();
        render(_jsx(HistoryFilters, { ...defaultProps, onChange: handleChange }));
        const select = screen.getByLabelText('Language');
        await userEvent.selectOptions(select, 'en');
        expect(handleChange).toHaveBeenCalledWith({
            provider: undefined,
            languageCode: 'en',
            action: undefined,
            startDate: undefined,
            endDate: undefined,
        });
    });
    it('calls onChange when action changes', async () => {
        const handleChange = vi.fn();
        render(_jsx(HistoryFilters, { ...defaultProps, onChange: handleChange }));
        const select = screen.getByLabelText('Action');
        await userEvent.selectOptions(select, 'download');
        expect(handleChange).toHaveBeenCalledWith({
            provider: undefined,
            languageCode: undefined,
            action: 'download',
            startDate: undefined,
            endDate: undefined,
        });
    });
    it('calls onChange when start date changes', async () => {
        const handleChange = vi.fn();
        render(_jsx(HistoryFilters, { ...defaultProps, onChange: handleChange }));
        const input = screen.getByLabelText('Start Date');
        await userEvent.type(input, '2026-02-01');
        expect(handleChange).toHaveBeenCalledWith({
            provider: undefined,
            languageCode: undefined,
            action: undefined,
            startDate: '2026-02-01',
            endDate: undefined,
        });
    });
    it('calls onChange when end date changes', async () => {
        const handleChange = vi.fn();
        render(_jsx(HistoryFilters, { ...defaultProps, onChange: handleChange }));
        const input = screen.getByLabelText('End Date');
        await userEvent.type(input, '2026-02-17');
        expect(handleChange).toHaveBeenCalledWith({
            provider: undefined,
            languageCode: undefined,
            action: undefined,
            startDate: undefined,
            endDate: '2026-02-17',
        });
    });
    it('calls onChange with empty value when clearing provider', async () => {
        const handleChange = vi.fn();
        const filters = { provider: 'OpenSubtitles' };
        render(_jsx(HistoryFilters, { ...defaultProps, onChange: handleChange, filters: filters }));
        const select = screen.getByLabelText('Provider');
        await userEvent.selectOptions(select, '');
        expect(handleChange).toHaveBeenCalledWith({
            provider: undefined,
            languageCode: undefined,
            action: undefined,
            startDate: undefined,
            endDate: undefined,
        });
    });
    it('calls onChange with all undefined when Clear Filters is clicked', async () => {
        const handleChange = vi.fn();
        const filters = {
            provider: 'OpenSubtitles',
            languageCode: 'en',
            action: 'download',
            startDate: '2026-02-01',
            endDate: '2026-02-17',
        };
        render(_jsx(HistoryFilters, { ...defaultProps, onChange: handleChange, filters: filters }));
        const button = screen.getByRole('button', { name: 'Clear Filters' });
        await userEvent.click(button);
        expect(handleChange).toHaveBeenCalledWith({
            provider: undefined,
            languageCode: undefined,
            action: undefined,
            startDate: undefined,
            endDate: undefined,
        });
    });
    it('displays current filter values', () => {
        const filters = {
            provider: 'OpenSubtitles',
            languageCode: 'en',
            action: 'download',
            startDate: '2026-02-01',
            endDate: '2026-02-17',
        };
        render(_jsx(HistoryFilters, { ...defaultProps, filters: filters }));
        const providerSelect = screen.getByLabelText('Provider');
        const languageSelect = screen.getByLabelText('Language');
        const actionSelect = screen.getByLabelText('Action');
        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');
        expect(providerSelect).toHaveValue('OpenSubtitles');
        expect(languageSelect).toHaveValue('en');
        expect(actionSelect).toHaveValue('download');
        expect(startDateInput).toHaveValue('2026-02-01');
        expect(endDateInput).toHaveValue('2026-02-17');
    });
});
//# sourceMappingURL=HistoryFilters.test.js.map