
import { useState } from 'react';
import { type SubtitleProvider, type ProviderSettings, type ProviderTestResult } from '@/lib/api';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Form, FormGroup, TextInput, PasswordInput } from '@/components/ui/form-compat';
import { NumberInput } from '@/components/primitives/SpecialInputs';
import { Switch } from '@/components/ui/switch-compat';
import { ProviderTestResult as TestResultDisplay } from './ProviderTestResult';
import { Alert } from '@/components/ui/alert-compat';

export interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: SubtitleProvider | null;
  onSave: (providerId: string, settings: ProviderSettings) => Promise<void>;
  onTest: (providerId: string) => Promise<ProviderTestResult>;
  onReset: (providerId: string) => Promise<SubtitleProvider>;
  isSaving?: boolean;
}

export function ProviderSettingsModal({
  isOpen,
  onClose,
  provider,
  onSave,
  onTest,
  onReset,
  isSaving = false,
}: ProviderSettingsModalProps) {
  const [settings, setSettings] = useState<ProviderSettings>({});
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!provider) {
    return null;
  }

  // Initialize settings from provider when modal opens or provider changes
  if (isOpen && provider) {
    const currentSettings = provider.settings ?? {};
    if (JSON.stringify(currentSettings) !== JSON.stringify(settings)) {
      setSettings(currentSettings);
    }
  }

  const handleSave = async () => {
    await onSave(provider.id, settings);
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(provider.id);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    setIsResetting(true);
    try {
      const resetProvider = await onReset(provider.id);
      setSettings(resetProvider.settings ?? {});
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Failed to reset provider:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleInputChange = <K extends keyof ProviderSettings>(key: K, value: ProviderSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderProviderFields = () => {
    switch (provider.type.toLowerCase()) {
      case 'opensubtitles':
        return (
          <>
            <FormGroup label="Username" htmlFor="username">
              <TextInput
                id="username"
                value={settings.username ?? ''}
                onChange={value => handleInputChange('username', value)}
                placeholder="OpenSubtitles username"
              />
            </FormGroup>
            <FormGroup label="Password" htmlFor="password">
              <PasswordInput
                id="password"
                value={settings.password ?? ''}
                onChange={value => handleInputChange('password', value)}
                placeholder="OpenSubtitles password"
              />
            </FormGroup>
            <FormGroup label="API Key (Optional)" htmlFor="apiKey" hint="Not required for all users">
              <PasswordInput
                id="apiKey"
                value={settings.apiKey ?? ''}
                onChange={value => handleInputChange('apiKey', value)}
                placeholder="OpenSubtitles API key"
              />
            </FormGroup>
          </>
        );

      case 'subscene':
      case 'podnapisi':
        return (
          <Alert variant="info">
            This provider does not require any configuration. Simply enable it to use.
          </Alert>
        );

      case 'addic7ed':
        return (
          <>
            <FormGroup label="Username" htmlFor="username">
              <TextInput
                id="username"
                value={settings.username ?? ''}
                onChange={value => handleInputChange('username', value)}
                placeholder="Addic7ed username"
              />
            </FormGroup>
            <FormGroup label="Password" htmlFor="password">
              <PasswordInput
                id="password"
                value={settings.password ?? ''}
                onChange={value => handleInputChange('password', value)}
                placeholder="Addic7ed password"
              />
            </FormGroup>
          </>
        );

      case 'generic':
      default:
        return (
          <>
            <FormGroup label="API Key" htmlFor="apiKey" hint="Required for most generic providers">
              <PasswordInput
                id="apiKey"
                value={settings.apiKey ?? ''}
                onChange={value => handleInputChange('apiKey', value)}
                placeholder="Provider API key"
              />
            </FormGroup>
            <FormGroup label="Timeout (seconds)" htmlFor="timeout" hint="Connection timeout duration">
              <NumberInput
                id="timeout"
                value={settings.timeout ?? 30}
                onChange={value => handleInputChange('timeout', value)}
                min={5}
                max={120}
              />
            </FormGroup>
            <FormGroup label="Max Results" htmlFor="maxResults" hint="Maximum search results to return">
              <NumberInput
                id="maxResults"
                value={settings.maxResults ?? 50}
                onChange={value => handleInputChange('maxResults', value)}
                min={1}
                max={200}
              />
            </FormGroup>
            <FormGroup label="Use SSL" htmlFor="useSSL" hint="Enable HTTPS connections">
              <Switch
                id="useSSL"
                checked={settings.useSSL ?? true}
                onChange={checked => handleInputChange('useSSL', checked)}
                label="Enable SSL"
              />
            </FormGroup>
          </>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel={`Configure ${provider.name} provider`}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
    >
      <ModalHeader
        title={`Configure ${provider.name}`}
        onClose={onClose}
        actions={
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={isTesting || isSaving || isResetting}
          >
            Test
          </Button>
        }
      />
      <ModalBody>
        <Form>
          <div className="space-y-4">{renderProviderFields()}</div>
        </Form>
        <TestResultDisplay result={testResult} isTesting={isTesting} />
      </ModalBody>
      <ModalFooter>
        <div className="flex items-center justify-between gap-4 w-full">
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting || isSaving || isTesting}
          >
            {isResetting ? 'Resetting...' : showResetConfirm ? 'Confirm Reset' : 'Reset'}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isSaving || isResetting || isTesting}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={isSaving || isResetting || isTesting}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
