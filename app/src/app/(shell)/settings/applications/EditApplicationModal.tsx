'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { CheckInput, Form, FormGroup, SelectInput, TextInput } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';

export interface EditApplicationDraft {
  id: number;
  name: string;
  type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  url: string;
  apiKey: string;
  syncEnabled: boolean;
}

export interface EditApplicationSource {
  id: number;
  name: string;
  type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  url: string;
  apiKey: string;
  syncEnabled: boolean;
}

interface ApplicationTypeOption {
  value: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  label: string;
}

interface EditApplicationModalProps {
  isOpen: boolean;
  application: EditApplicationSource;
  applicationTypes: ApplicationTypeOption[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (draft: EditApplicationDraft) => void | Promise<void>;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function EditApplicationModal({
  isOpen,
  application,
  applicationTypes,
  isSubmitting = false,
  onClose,
  onSave,
}: EditApplicationModalProps) {
  const [name, setName] = useState(application.name);
  const [type, setType] = useState(application.type);
  const [url, setUrl] = useState(application.url);
  const [apiKey, setApiKey] = useState(application.apiKey);
  const [syncEnabled, setSyncEnabled] = useState(application.syncEnabled);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setValidationError('Name is required.');
      return;
    }

    if (url.trim().length === 0) {
      setValidationError('URL is required.');
      return;
    }

    if (!isValidUrl(url)) {
      setValidationError('URL must be a valid URL.');
      return;
    }

    if (apiKey.trim().length === 0) {
      setValidationError('API Key is required.');
      return;
    }

    setValidationError(null);

    await onSave({
      id: application.id,
      name: name.trim(),
      type,
      url: url.trim(),
      apiKey: apiKey.trim(),
      syncEnabled,
    });
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Edit application" onClose={onClose} maxWidthClassName="max-w-2xl">
      <ModalHeader title="Edit Application" onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <FormGroup label="Name" htmlFor="edit-application-name">
            <TextInput id="edit-application-name" ariaLabel="Name" value={name} onChange={setName} />
          </FormGroup>

          <SelectInput
            id="edit-application-type"
            label="Application Type"
            value={type}
            onChange={value => setType(value as 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr')}
            options={applicationTypes}
          />

          <FormGroup label="URL" htmlFor="edit-application-url">
            <TextInput id="edit-application-url" ariaLabel="URL" type="url" value={url} onChange={setUrl} />
          </FormGroup>

          <FormGroup label="API Key" htmlFor="edit-application-apikey">
            <TextInput
              id="edit-application-apikey"
              ariaLabel="API Key"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder="Leave unchanged to keep existing key"
            />
          </FormGroup>

          <CheckInput id="edit-application-sync" label="Sync Indexers" checked={syncEnabled} onChange={setSyncEnabled} />

          {validationError ? (
            <p role="alert" className="text-sm text-status-error">
              {validationError}
            </p>
          ) : null}

          <ModalFooter>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              Save Changes
            </Button>
          </ModalFooter>
        </Form>
      </ModalBody>
    </Modal>
  );
}
