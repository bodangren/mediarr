'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { CheckInput, Form, FormGroup, SelectInput, TextInput } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';

export interface AddApplicationDraft {
  name: string;
  type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  url: string;
  apiKey: string;
  syncEnabled: boolean;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  hints: string[];
}

interface ApplicationTypeOption {
  value: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  label: string;
}

interface AddApplicationModalProps {
  isOpen: boolean;
  applicationTypes: ApplicationTypeOption[];
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (draft: AddApplicationDraft) => void | Promise<void>;
  onTestConnection: (draft: AddApplicationDraft) => Promise<TestConnectionResult>;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function AddApplicationModal({
  isOpen,
  applicationTypes,
  isSubmitting = false,
  onClose,
  onCreate,
  onTestConnection,
}: AddApplicationModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr'>('Sonarr');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName('');
    setType('Sonarr');
    setUrl('');
    setApiKey('');
    setSyncEnabled(true);
    setValidationError(null);
    setTestResult(null);
  }, [isOpen]);

  const buildDraft = (): AddApplicationDraft | null => {
    if (name.trim().length === 0) {
      setValidationError('Name is required.');
      return null;
    }

    if (url.trim().length === 0) {
      setValidationError('URL is required.');
      return null;
    }

    if (!isValidUrl(url)) {
      setValidationError('URL must be a valid URL.');
      return null;
    }

    if (apiKey.trim().length === 0) {
      setValidationError('API Key is required.');
      return null;
    }

    setValidationError(null);

    return {
      name: name.trim(),
      type,
      url: url.trim(),
      apiKey: apiKey.trim(),
      syncEnabled,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const draft = buildDraft();
    if (!draft) {
      return;
    }

    await onCreate(draft);
  };

  const handleTestConnection = async () => {
    const draft = buildDraft();
    if (!draft) {
      return;
    }

    setIsTesting(true);
    try {
      const result = await onTestConnection(draft);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Add application" onClose={onClose} maxWidthClassName="max-w-2xl">
      <ModalHeader title="Add Application" onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <FormGroup label="Name" htmlFor="add-application-name">
            <TextInput id="add-application-name" ariaLabel="Name" value={name} onChange={setName} placeholder="My Sonarr" />
          </FormGroup>

          <SelectInput
            id="add-application-type"
            label="Application Type"
            value={type}
            onChange={value => setType(value as 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr')}
            options={applicationTypes}
          />

          <FormGroup label="URL" htmlFor="add-application-url">
            <TextInput
              id="add-application-url"
              ariaLabel="URL"
              type="url"
              value={url}
              onChange={setUrl}
              placeholder="http://localhost:8989"
            />
          </FormGroup>

          <FormGroup label="API Key" htmlFor="add-application-apikey">
            <TextInput
              id="add-application-apikey"
              ariaLabel="API Key"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder="Enter API key"
            />
          </FormGroup>

          <CheckInput id="add-application-sync" label="Sync Indexers" checked={syncEnabled} onChange={setSyncEnabled} />

          {validationError ? (
            <p role="alert" className="text-sm text-status-error">
              {validationError}
            </p>
          ) : null}

          {testResult ? (
            <section className="rounded-sm border border-border-subtle bg-surface-0 p-3 text-sm">
              <p className={testResult.success ? 'text-status-success' : 'text-status-error'}>{testResult.message}</p>
              {testResult.hints.length > 0 ? (
                <ul className="mt-2 list-disc pl-4 text-text-secondary">
                  {testResult.hints.map(hint => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <ModalFooter>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting || isTesting}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleTestConnection} disabled={isSubmitting || isTesting}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting || isTesting}>
              Add Application
            </Button>
          </ModalFooter>
        </Form>
      </ModalBody>
    </Modal>
  );
}
