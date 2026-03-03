import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/shell/AppShell';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import SettingsIndexersPage from './page';
vi.mock('@/lib/api/client');
function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    vi.mocked(getApiClients).mockReturnValue({
        indexerApi: {},
        downloadClientsApi: {},
        applicationsApi: {},
        mediaApi: {},
        releaseApi: {},
        torrentApi: {},
        importApi: {},
        notificationsApi: {},
        eventsApi: {
            connectionState: 'idle',
            onStateChange: vi.fn(() => () => { }),
        },
    });
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: _jsx(AppShell, { pathname: "/settings/indexers", children: _jsx(SettingsIndexersPage, {}) }) }) }));
}
describe('settings indexers page', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });
    it('renders indexer settings page with all sections', async () => {
        renderPage();
        expect(screen.getByRole('heading', { name: 'Indexer Settings' })).toBeInTheDocument();
        // Indexer Management section
        expect(screen.getByRole('heading', { name: 'Indexer Management' })).toBeInTheDocument();
        expect(screen.getByText('Manage your configured indexers, test connections, and configure settings.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Go to Indexer Management' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Go to Indexer Management' })).toHaveAttribute('href', '/indexers');
        // Indexer Proxies section
        expect(screen.getByRole('heading', { name: 'Indexer Proxies' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add Proxy' })).toBeInTheDocument();
        expect(screen.getByText('Proxy configuration is stored locally in this browser.')).toBeInTheDocument();
        expect(screen.getByText('No proxies configured. Click Add Proxy to create one.')).toBeInTheDocument();
        // Indexer Categories section
        expect(screen.getByRole('heading', { name: 'Indexer Categories' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add Category' })).toBeInTheDocument();
        expect(screen.getByText('Category configuration is stored locally in this browser.')).toBeInTheDocument();
        expect(screen.getByText('Movies (HD)')).toBeInTheDocument();
        expect(screen.getByText('Movies (SD)')).toBeInTheDocument();
        expect(screen.getByText('TV Episodes (HD)')).toBeInTheDocument();
        expect(screen.getByText('TV Episodes (SD)')).toBeInTheDocument();
    });
    it('opens add proxy form when Add Proxy is clicked', async () => {
        renderPage();
        // Find Add Proxy button - it's in the Indexer Proxies section
        // Get all Add Proxy buttons (there's one in proxies section and one in categories section)
        const addProxyButtons = screen.getAllByRole('button', { name: 'Add Proxy' });
        // Click the first one (proxies section comes first in DOM)
        fireEvent.click(addProxyButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Proxy' })).toBeInTheDocument();
            expect(screen.getByText('Proxy Name')).toBeInTheDocument();
            expect(screen.getByText('Proxy Type')).toBeInTheDocument();
            expect(screen.getByText('Host')).toBeInTheDocument();
            expect(screen.getByText('Port')).toBeInTheDocument();
            // The form has its own Add Proxy button
            expect(screen.getAllByRole('button', { name: 'Add Proxy' })).toHaveLength(2);
            expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1);
        });
    });
    it('opens add category form when Add Category is clicked', async () => {
        renderPage();
        // Find Add Category button in Indexer Categories section
        const addCategoryButtons = screen.getAllByRole('button', { name: 'Add Category' });
        // Click the Add Category button (only one initially)
        fireEvent.click(addCategoryButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Category' })).toBeInTheDocument();
            expect(screen.getByText('Category Name')).toBeInTheDocument();
            expect(screen.getByText('Description')).toBeInTheDocument();
            expect(screen.getByText('Minimum Size (GB)')).toBeInTheDocument();
            expect(screen.getByText('Maximum Size (GB)')).toBeInTheDocument();
            // The form has its own Add Category button
            expect(screen.getAllByRole('button', { name: 'Add Category' })).toHaveLength(2);
            expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1);
        });
    });
    it('displays default categories with size information', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Movies (HD)')).toBeInTheDocument();
            expect(screen.getByText('Movies (SD)')).toBeInTheDocument();
            expect(screen.getByText('TV Episodes (HD)')).toBeInTheDocument();
            expect(screen.getByText('TV Episodes (SD)')).toBeInTheDocument();
            expect(screen.getByText('High definition movies')).toBeInTheDocument();
            expect(screen.getByText('Standard definition movies')).toBeInTheDocument();
            expect(screen.getByText('High definition TV episodes')).toBeInTheDocument();
            expect(screen.getByText('Standard definition TV episodes')).toBeInTheDocument();
        });
        // Check that size information is displayed (text content may vary)
        const sizeElements = screen.getAllByText(/Size:/);
        expect(sizeElements.length).toBeGreaterThan(0);
    });
    it('allows deleting a category', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Movies (HD)')).toBeInTheDocument();
        });
        const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
        // Find delete button that's inside categories section (not proxy section)
        const categoryDeleteButtons = deleteButtons.filter(btn => {
            const parent = btn.parentElement;
            if (!parent)
                return false;
            const grandparent = parent.parentElement;
            if (!grandparent)
                return false;
            // Check if this delete button is in a section containing "Movies (HD)"
            return grandparent.textContent?.includes('Movies (HD)');
        });
        if (categoryDeleteButtons.length > 0) {
            fireEvent.click(categoryDeleteButtons[0]);
        }
        await waitFor(() => {
            expect(screen.queryByText('Movies (HD)')).not.toBeInTheDocument();
        });
    });
    it('closes add proxy form on cancel', async () => {
        renderPage();
        // Find Add Proxy button
        const addProxyButtons = screen.getAllByRole('button', { name: 'Add Proxy' });
        fireEvent.click(addProxyButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Proxy' })).toBeInTheDocument();
        });
        const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
        // Click first Cancel button (should be in proxy form)
        if (cancelButtons.length > 0) {
            fireEvent.click(cancelButtons[0]);
        }
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Add New Proxy' })).not.toBeInTheDocument();
        });
    });
    it('closes add category form on cancel', async () => {
        renderPage();
        // Find Add Category button
        const addCategoryButtons = screen.getAllByRole('button', { name: 'Add Category' });
        fireEvent.click(addCategoryButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Category' })).toBeInTheDocument();
        });
        const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
        // Click first Cancel button (should be in category form)
        if (cancelButtons.length > 0) {
            fireEvent.click(cancelButtons[0]);
        }
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Add New Category' })).not.toBeInTheDocument();
        });
    });
    it('adds a proxy and persists all typed values', async () => {
        renderPage();
        // Click Add Proxy button
        const addProxyButtons = screen.getAllByRole('button', { name: 'Add Proxy' });
        fireEvent.click(addProxyButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Proxy' })).toBeInTheDocument();
        });
        // Get the form container
        const formContainer = screen.getByRole('heading', { name: 'Add New Proxy' }).closest('div')?.parentElement;
        if (!formContainer) {
            throw new Error('Form container not found');
        }
        const withinForm = within(formContainer);
        // Fill in all proxy fields
        const nameInput = withinForm.getByPlaceholderText('e.g., HTTP Proxy 1');
        const typeSelect = withinForm.getByDisplayValue('HTTP');
        const hostInput = withinForm.getByPlaceholderText('e.g., 192.168.1.1 or proxy.example.com');
        const portInput = withinForm.getByPlaceholderText('e.g., 8080');
        fireEvent.change(nameInput, { target: { value: 'My Test Proxy' } });
        fireEvent.change(hostInput, { target: { value: 'proxy.example.com' } });
        fireEvent.change(portInput, { target: { value: '9999' } });
        fireEvent.change(typeSelect, { target: { value: 'socks5' } });
        // Click Add Proxy button in the form (the one with primary variant)
        const formAddProxyButtons = withinForm.getAllByRole('button', { name: 'Add Proxy' });
        const formAddProxyButton = formAddProxyButtons.find(btn => btn.classList.contains('bg-accent-primary'));
        if (!formAddProxyButton) {
            throw new Error('Add Proxy button in form not found');
        }
        fireEvent.click(formAddProxyButton);
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Add New Proxy' })).not.toBeInTheDocument();
        });
        // Verify the proxy was added with all values persisted
        await waitFor(() => {
            expect(screen.getByText('My Test Proxy')).toBeInTheDocument();
            expect(screen.getByText('SOCKS5 - proxy.example.com:9999')).toBeInTheDocument();
        });
    });
    it('adds a category and persists all typed values', async () => {
        renderPage();
        // Click Add Category button
        const addCategoryButtons = screen.getAllByRole('button', { name: 'Add Category' });
        fireEvent.click(addCategoryButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Category' })).toBeInTheDocument();
        });
        // Get the form container
        const formContainer = screen.getByRole('heading', { name: 'Add New Category' }).closest('div')?.parentElement;
        if (!formContainer) {
            throw new Error('Form container not found');
        }
        const withinForm = within(formContainer);
        // Fill in all category fields
        const nameInput = withinForm.getByPlaceholderText('e.g., Movies 4K');
        const descInput = withinForm.getByPlaceholderText('Optional description');
        const minSizeInput = withinForm.getByPlaceholderText('Optional minimum size');
        const maxSizeInput = withinForm.getByPlaceholderText('Optional maximum size');
        fireEvent.change(nameInput, { target: { value: 'Test Category' } });
        fireEvent.change(descInput, { target: { value: 'A test category description' } });
        fireEvent.change(minSizeInput, { target: { value: '1.5' } });
        fireEvent.change(maxSizeInput, { target: { value: '10' } });
        // Click Add Category button in the form (the one with primary variant)
        const formAddCategoryButtons = withinForm.getAllByRole('button', { name: 'Add Category' });
        const formAddCategoryButton = formAddCategoryButtons.find(btn => btn.classList.contains('bg-accent-primary'));
        if (!formAddCategoryButton) {
            throw new Error('Add Category button in form not found');
        }
        fireEvent.click(formAddCategoryButton);
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Add New Category' })).not.toBeInTheDocument();
        });
        // Verify the category was added with all values persisted
        await waitFor(() => {
            expect(screen.getByText('Test Category')).toBeInTheDocument();
            expect(screen.getByText('A test category description')).toBeInTheDocument();
            expect(screen.getByText(/Size: 1\.5 GB - 10\.0 GB/)).toBeInTheDocument();
        });
    });
    it('does not add proxy with empty required fields', async () => {
        renderPage();
        // Click Add Proxy button
        const addProxyButtons = screen.getAllByRole('button', { name: 'Add Proxy' });
        fireEvent.click(addProxyButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Proxy' })).toBeInTheDocument();
        });
        // Get the form container
        const formContainer = screen.getByRole('heading', { name: 'Add New Proxy' }).closest('div')?.parentElement;
        if (!formContainer) {
            throw new Error('Form container not found');
        }
        const withinForm = within(formContainer);
        // Leave required fields empty and try to add
        const formAddProxyButtons = withinForm.getAllByRole('button', { name: 'Add Proxy' });
        const formAddProxyButton = formAddProxyButtons.find(btn => btn.classList.contains('bg-accent-primary'));
        if (!formAddProxyButton) {
            throw new Error('Add Proxy button in form not found');
        }
        fireEvent.click(formAddProxyButton);
        // Form should remain open (validation failed)
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Proxy' })).toBeInTheDocument();
        });
        // No proxies should be in the list
        expect(screen.getByText('No proxies configured. Click Add Proxy to create one.')).toBeInTheDocument();
    });
    it('does not add category with empty required fields', async () => {
        renderPage();
        // Click Add Category button
        const addCategoryButtons = screen.getAllByRole('button', { name: 'Add Category' });
        fireEvent.click(addCategoryButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Category' })).toBeInTheDocument();
        });
        // Get the form container
        const formContainer = screen.getByRole('heading', { name: 'Add New Category' }).closest('div')?.parentElement;
        if (!formContainer) {
            throw new Error('Form container not found');
        }
        const withinForm = within(formContainer);
        // Fill only optional fields, leave name empty
        const descInput = withinForm.getByPlaceholderText('Optional description');
        fireEvent.change(descInput, { target: { value: 'Only description' } });
        // Try to add without required name
        const formAddCategoryButtons = withinForm.getAllByRole('button', { name: 'Add Category' });
        const formAddCategoryButton = formAddCategoryButtons.find(btn => btn.classList.contains('bg-accent-primary'));
        if (!formAddCategoryButton) {
            throw new Error('Add Category button in form not found');
        }
        fireEvent.click(formAddCategoryButton);
        // Form should remain open (validation failed)
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Category' })).toBeInTheDocument();
        });
    });
    it('can add proxy with only required fields', async () => {
        renderPage();
        // Click Add Proxy button
        const addProxyButtons = screen.getAllByRole('button', { name: 'Add Proxy' });
        fireEvent.click(addProxyButtons[0]);
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add New Proxy' })).toBeInTheDocument();
        });
        // Get the form container
        const formContainer = screen.getByRole('heading', { name: 'Add New Proxy' }).closest('div')?.parentElement;
        if (!formContainer) {
            throw new Error('Form container not found');
        }
        const withinForm = within(formContainer);
        // Fill only required fields (name, host, port)
        const nameInput = withinForm.getByPlaceholderText('e.g., HTTP Proxy 1');
        const hostInput = withinForm.getByPlaceholderText('e.g., 192.168.1.1 or proxy.example.com');
        // Port should have default value already
        fireEvent.change(nameInput, { target: { value: 'Minimal Proxy' } });
        fireEvent.change(hostInput, { target: { value: 'minimal.example.com' } });
        // Click Add Proxy button (the one with primary variant)
        const formAddProxyButtons = withinForm.getAllByRole('button', { name: 'Add Proxy' });
        const formAddProxyButton = formAddProxyButtons.find(btn => btn.classList.contains('bg-accent-primary'));
        if (!formAddProxyButton) {
            throw new Error('Add Proxy button in form not found');
        }
        fireEvent.click(formAddProxyButton);
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Add New Proxy' })).not.toBeInTheDocument();
        });
        // Verify proxy was added with default type and persisted values
        await waitFor(() => {
            expect(screen.getByText('Minimal Proxy')).toBeInTheDocument();
            expect(screen.getByText('HTTP - minimal.example.com:8080')).toBeInTheDocument();
        });
    });
    it('persists proxies to localStorage', async () => {
        // Pre-populate localStorage with a proxy
        const testProxy = {
            id: 12345,
            name: 'Persisted Proxy',
            type: 'socks5',
            host: 'persisted.example.com',
            port: 9999,
            enabled: true,
        };
        window.localStorage.setItem('mediarr:indexer-proxies', JSON.stringify([testProxy]));
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Persisted Proxy')).toBeInTheDocument();
            expect(screen.getByText('SOCKS5 - persisted.example.com:9999')).toBeInTheDocument();
        });
    });
    it('persists categories to localStorage', async () => {
        // Pre-populate localStorage with custom categories
        const testCategories = [
            {
                id: 999,
                name: 'Custom Category',
                description: 'A custom category from localStorage',
                minSize: 2147483648, // 2 GB
                maxSize: 10737418240, // 10 GB
            },
        ];
        window.localStorage.setItem('mediarr:indexer-categories', JSON.stringify(testCategories));
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Custom Category')).toBeInTheDocument();
            expect(screen.getByText('A custom category from localStorage')).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=page.test.js.map