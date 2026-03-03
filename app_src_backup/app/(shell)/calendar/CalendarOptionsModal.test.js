import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CalendarOptionsModal } from './CalendarOptionsModal';
describe('CalendarOptionsModal', () => {
    const defaultOptions = {
        showDayNumbers: true,
        showWeekNumbers: false,
        showMonitored: true,
        showUnmonitored: true,
        showCinemaReleases: true,
        showDigitalReleases: true,
        showPhysicalReleases: true,
    };
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        options: defaultOptions,
        onOptionsChange: vi.fn(),
    };
    it('renders modal with title', () => {
        render(_jsx(CalendarOptionsModal, { ...defaultProps }));
        expect(screen.getByText('Calendar Options')).toBeInTheDocument();
    });
    it('renders display section with all options', () => {
        render(_jsx(CalendarOptionsModal, { ...defaultProps }));
        expect(screen.getByText('Display')).toBeInTheDocument();
        expect(screen.getByText('Show Day Numbers')).toBeInTheDocument();
        expect(screen.getByText('Show Week Numbers')).toBeInTheDocument();
    });
    it('renders content filters section with all options', () => {
        render(_jsx(CalendarOptionsModal, { ...defaultProps }));
        expect(screen.getByText('Content Filters')).toBeInTheDocument();
        expect(screen.getByText('Show Monitored Items')).toBeInTheDocument();
        expect(screen.getByText('Show Unmonitored Items')).toBeInTheDocument();
    });
    it('renders release types section with all options', () => {
        render(_jsx(CalendarOptionsModal, { ...defaultProps }));
        expect(screen.getByText('Release Types')).toBeInTheDocument();
        expect(screen.getByText('Cinema Releases')).toBeInTheDocument();
        expect(screen.getByText('Digital Releases')).toBeInTheDocument();
        expect(screen.getByText('Physical Releases')).toBeInTheDocument();
    });
    it('shows checkmark for enabled options', () => {
        render(_jsx(CalendarOptionsModal, { ...defaultProps }));
        // Get all option buttons
        const showDayNumbersButton = screen.getByText('Show Day Numbers').closest('button');
        const showWeekNumbersButton = screen.getByText('Show Week Numbers').closest('button');
        // Check that checkmark SVG is present for enabled option
        expect(showDayNumbersButton.querySelector('svg')).toBeInTheDocument();
        // Check that checkmark SVG is not present for disabled option
        expect(showWeekNumbersButton.querySelector('svg')).not.toBeInTheDocument();
    });
    it('toggles option when clicked', async () => {
        const onOptionsChange = vi.fn();
        render(_jsx(CalendarOptionsModal, { ...defaultProps, onOptionsChange: onOptionsChange }));
        const showDayNumbersButton = screen.getByText('Show Day Numbers').closest('button');
        await userEvent.click(showDayNumbersButton);
        expect(onOptionsChange).toHaveBeenCalledWith({
            ...defaultOptions,
            showDayNumbers: false,
        });
    });
    it('calls onClose when Cancel is clicked', async () => {
        const onClose = vi.fn();
        render(_jsx(CalendarOptionsModal, { ...defaultProps, onClose: onClose }));
        const cancelButton = screen.getByText('Cancel');
        await userEvent.click(cancelButton);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('calls onClose when Save Changes is clicked', async () => {
        const onClose = vi.fn();
        render(_jsx(CalendarOptionsModal, { ...defaultProps, onClose: onClose }));
        const saveButton = screen.getByText('Save Changes');
        await userEvent.click(saveButton);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('resets to defaults when Reset is clicked', async () => {
        const onOptionsChange = vi.fn();
        render(_jsx(CalendarOptionsModal, { ...defaultProps, onOptionsChange: onOptionsChange }));
        const resetButton = screen.getByText('Reset to Defaults');
        await userEvent.click(resetButton);
        expect(onOptionsChange).toHaveBeenCalledWith({
            showDayNumbers: true,
            showWeekNumbers: false,
            showMonitored: true,
            showUnmonitored: true,
            showCinemaReleases: true,
            showDigitalReleases: true,
            showPhysicalReleases: true,
        });
    });
    it('does not render when closed', () => {
        const { container } = render(_jsx(CalendarOptionsModal, { ...defaultProps, isOpen: false }));
        expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });
});
//# sourceMappingURL=CalendarOptionsModal.test.js.map