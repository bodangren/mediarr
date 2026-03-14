
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  hints?: string[];
}

export interface PresetBase {
  id: string;
}

export interface ConfigurableItemModalProps<TPreset extends PresetBase, TFieldValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  presets: TPreset[];
  selectedPresetId?: string;
  fieldValues: TFieldValues;
  isSubmitting?: boolean;
  isTesting?: boolean;
  testResult?: TestConnectionResult | null;
  error?: string | null;
  saveButtonText?: string;
  renderPresetGrid: (
    presets: TPreset[],
    selectedId: string | undefined,
    onSelect: (id: string) => void,
  ) => React.ReactNode;
  renderFields: (
    preset: TPreset | undefined,
    values: TFieldValues,
    onChange: (field: string, value: unknown) => void,
  ) => React.ReactNode;
  onSelectPreset: (presetId: string) => void;
  onFieldChange: (field: string, value: unknown) => void;
  onTestConnection: () => void;
  onSave: () => void;
}

export function ConfigurableItemModal<TPreset extends PresetBase, TFieldValues>({
  isOpen,
  onClose,
  title,
  presets,
  selectedPresetId,
  fieldValues,
  isSubmitting = false,
  isTesting = false,
  testResult,
  error,
  saveButtonText = 'Save',
  renderPresetGrid,
  renderFields,
  onSelectPreset,
  onFieldChange,
  onTestConnection,
  onSave,
}: ConfigurableItemModalProps<TPreset, TFieldValues>) {
  const selectedPreset: TPreset | undefined = presets.length === 0 ? undefined : presets.find(p => p.id === selectedPresetId) ?? presets[0];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  return (
    <Modal isOpen={isOpen} ariaLabel={title} onClose={onClose} maxWidthClassName="max-w-3xl">
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <section className="space-y-2">
            {renderPresetGrid(presets, selectedPresetId, onSelectPreset)}
          </section>

          {renderFields(selectedPreset, fieldValues, onFieldChange)}

          {error ? (
            <p role="alert" className="text-sm text-status-error">
              {error}
            </p>
          ) : null}

          {testResult ? (
            <section className="rounded-sm border border-border-subtle bg-surface-0 p-3 text-sm">
              <p className={testResult.success ? 'text-status-success' : 'text-status-error'}>{testResult.message}</p>
              {testResult.hints && testResult.hints.length > 0 ? (
                <ul className="list-disc pl-4 text-text-secondary">
                  {testResult.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting || isTesting}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={onTestConnection} disabled={isSubmitting || isTesting}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
        <form onSubmit={handleSubmit}>
          <Button variant="default" type="submit" disabled={isSubmitting || isTesting}>
            {saveButtonText}
          </Button>
        </form>
      </ModalFooter>
    </Modal>
  );
}
