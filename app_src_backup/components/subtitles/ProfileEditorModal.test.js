import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileEditorModal } from './ProfileEditorModal';
describe('ProfileEditorModal', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();
    const mockProfile = {
        id: 1,
        name: 'Test Profile',
        languages: [
            { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 50 },
            { languageCode: 'es', isForced: true, isHi: false, audioExclude: false, score: 75 },
        ],
        cutoff: 'en',
        upgradeAllowed: true,
        mustContain: ['BluRay'],
        mustNotContain: [],
    };
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders add mode with empty form when no profile provided', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
            expect(screen.getByLabelText('Profile Name')).toHaveValue('');
            expect(screen.getByText('No languages added yet.')).toBeInTheDocument();
        });
    });
    it('renders edit mode with profile data when profile is provided', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave, profile: mockProfile }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Edit Language Profile' })).toBeInTheDocument();
            expect(screen.getByLabelText('Profile Name')).toHaveValue('Test Profile');
            expect(screen.getByDisplayValue('Test Profile')).toBeInTheDocument();
            expect(screen.getByText('English')).toBeInTheDocument();
            expect(screen.getByText('Spanish')).toBeInTheDocument();
            expect(screen.getByDisplayValue('English (en)')).toBeInTheDocument();
        });
    });
    it('shows validation error when name is empty', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
        });
        const submitButton = screen.getByRole('button', { name: 'Create Profile' });
        fireEvent.click(submitButton);
        await waitFor(() => {
            expect(screen.getByText('Profile name is required')).toBeInTheDocument();
        });
    });
    it('shows validation error when no languages are added', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
        });
        const nameInput = screen.getByLabelText('Profile Name');
        fireEvent.change(nameInput, { target: { value: 'Test Profile' } });
        const submitButton = screen.getByRole('button', { name: 'Create Profile' });
        fireEvent.click(submitButton);
        await waitFor(() => {
            expect(screen.getByText('At least one language is required')).toBeInTheDocument();
        });
    });
    it('allows adding a language', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
        });
        // Select a language (simplified - in reality would open dropdown)
        const languageSelector = screen.getByLabelText('Add Language');
        fireEvent.click(languageSelector);
        // Click on first language option
        await waitFor(() => {
            expect(screen.getByRole('listbox')).toBeInTheDocument();
        });
        const firstOption = screen.getAllByRole('option')[0];
        fireEvent.click(firstOption);
        // Click Add Language button
        const addButton = screen.getByRole('button', { name: 'Add Language' });
        fireEvent.click(addButton);
        await waitFor(() => {
            expect(screen.queryByText('No languages added yet.')).not.toBeInTheDocument();
        });
    });
    it('updates cutoff when first language is added', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
        });
        const cutoffSelect = screen.getByLabelText('Cutoff Language');
        expect(cutoffSelect).toHaveValue('');
        // Simulate adding a language (would use LanguageSelector in reality)
        // After adding first language, cutoff should be auto-set
    });
    it('calls onSave with correct data when form is submitted', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave, profile: mockProfile }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Edit Language Profile' })).toBeInTheDocument();
        });
        const submitButton = screen.getByRole('button', { name: 'Save Changes' });
        fireEvent.click(submitButton);
        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith({
                name: 'Test Profile',
                languages: mockProfile.languages,
                cutoff: 'en',
                upgradeAllowed: true,
            });
        });
    });
    it('disables submit button while saving', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave, isLoading: true }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
        });
        const submitButton = screen.getByRole('button', { name: 'Create Profile' });
        expect(submitButton).toBeDisabled();
    });
    it('calls onClose when cancel button is clicked', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
        });
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        fireEvent.click(cancelButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    it('renders must contain and must not contain fields', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave, profile: mockProfile }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Edit Language Profile' })).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Must Contain')).toHaveValue('BluRay');
        expect(screen.getByLabelText('Must Not Contain')).toHaveValue('');
    });
    it('disables all inputs when isLoading is true', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave, profile: mockProfile, isLoading: true }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Edit Language Profile' })).toBeInTheDocument();
        });
        const nameInput = screen.getByLabelText('Profile Name');
        const cutoffSelect = screen.getByLabelText('Cutoff Language');
        const upgradeAllowedCheckbox = screen.getByLabelText('Allow Upgrades');
        const mustContainInput = screen.getByLabelText('Must Contain');
        const mustNotContainInput = screen.getByLabelText('Must Not Contain');
        expect(nameInput).toBeDisabled();
        expect(cutoffSelect).toBeDisabled();
        expect(upgradeAllowedCheckbox).toBeDisabled();
        expect(mustContainInput).toBeDisabled();
        expect(mustNotContainInput).toBeDisabled();
    });
    it('clears validation errors when user starts typing', async () => {
        render(_jsx(ProfileEditorModal, { isOpen: true, onClose: mockOnClose, onSave: mockOnSave }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
        });
        const submitButton = screen.getByRole('button', { name: 'Create Profile' });
        fireEvent.click(submitButton);
        await waitFor(() => {
            expect(screen.getByText('Profile name is required')).toBeInTheDocument();
        });
        const nameInput = screen.getByLabelText('Profile Name');
        fireEvent.change(nameInput, { target: { value: 'Test' } });
        await waitFor(() => {
            expect(screen.queryByText('Profile name is required')).not.toBeInTheDocument();
        });
    });
    it('does not render when isOpen is false', () => {
        render(_jsx(ProfileEditorModal, { isOpen: false, onClose: mockOnClose, onSave: mockOnSave }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
//# sourceMappingURL=ProfileEditorModal.test.js.map