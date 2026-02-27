import { Button } from '@/components/primitives/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Check } from 'lucide-react';
import type { CalendarOptions } from '@/types/calendar';

interface CalendarOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: CalendarOptions;
  onOptionsChange: (options: CalendarOptions) => void;
}

export function CalendarOptionsModal({
  isOpen,
  onClose,
  options,
  onOptionsChange,
}: CalendarOptionsModalProps) {
  const handleToggle = (key: keyof CalendarOptions) => {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Calendar Options">
      <ModalHeader title="Calendar Options" onClose={onClose} />

      <ModalBody>
        <div className="space-y-6">
          {/* Display Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Display</h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleToggle('showDayNumbers')}
                className="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2"
              >
                <span className="text-sm text-text-primary">Show Day Numbers</span>
                {options.showDayNumbers && <Check className="h-4 w-4 text-accent-primary" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggle('showWeekNumbers')}
                className="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2"
              >
                <span className="text-sm text-text-primary">Show Week Numbers</span>
                {options.showWeekNumbers && <Check className="h-4 w-4 text-accent-primary" />}
              </button>
            </div>
          </div>

          {/* Content Filter Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Content Filters</h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleToggle('showMonitored')}
                className="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2"
              >
                <span className="text-sm text-text-primary">Show Monitored Items</span>
                {options.showMonitored && <Check className="h-4 w-4 text-accent-primary" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggle('showUnmonitored')}
                className="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2"
              >
                <span className="text-sm text-text-primary">Show Unmonitored Items</span>
                {options.showUnmonitored && <Check className="h-4 w-4 text-accent-primary" />}
              </button>
            </div>
          </div>

          {/* Release Type Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Release Types</h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleToggle('showCinemaReleases')}
                className="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2"
              >
                <span className="text-sm text-text-primary">Cinema Releases</span>
                {options.showCinemaReleases && <Check className="h-4 w-4 text-accent-primary" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggle('showDigitalReleases')}
                className="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2"
              >
                <span className="text-sm text-text-primary">Digital Releases</span>
                {options.showDigitalReleases && <Check className="h-4 w-4 text-accent-primary" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggle('showPhysicalReleases')}
                className="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-surface-1 p-3 transition hover:border-border-default hover:bg-surface-2"
              >
                <span className="text-sm text-text-primary">Physical Releases</span>
                {options.showPhysicalReleases && <Check className="h-4 w-4 text-accent-primary" />}
              </button>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
