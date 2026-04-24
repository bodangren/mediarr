
import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type SubtitleProvider, type ProviderSettings, type ProviderTestResult } from '@/lib/api';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const baseSettingsSchema = z.object({
  username: z.string().default(''),
  password: z.string().default(''),
  apiKey: z.string().default(''),
  timeout: z.number().default(30),
  maxResults: z.number().default(50),
  useSSL: z.boolean().default(true),
});

type SettingsFormValues = z.infer<typeof baseSettingsSchema>;

function getProviderSchema(providerType: string) {
  switch (providerType.toLowerCase()) {
    case 'opensubtitles':
      return z.object({
        username: z.string().min(1, 'Username is required'),
        password: z.string().min(1, 'Password is required'),
        apiKey: z.string().optional(),
        timeout: z.number().optional(),
        maxResults: z.number().optional(),
        useSSL: z.boolean().optional(),
      });
    case 'addic7ed':
      return z.object({
        username: z.string().min(1, 'Username is required'),
        password: z.string().min(1, 'Password is required'),
        apiKey: z.string().optional(),
        timeout: z.number().optional(),
        maxResults: z.number().optional(),
        useSSL: z.boolean().optional(),
      });
    case 'subscene':
    case 'podnapisi':
      return z.object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        timeout: z.number().optional(),
        maxResults: z.number().optional(),
        useSSL: z.boolean().optional(),
      });
    case 'generic':
    default:
      return z.object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        timeout: z.number().optional(),
        maxResults: z.number().optional(),
        useSSL: z.boolean().optional(),
      });
  }
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
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const providerSchema = useMemo(() => {
    if (!provider) return baseSettingsSchema;
    return getProviderSchema(provider.type);
  }, [provider?.type]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(providerSchema) as unknown as Resolver<SettingsFormValues>,
    defaultValues: {
      username: '',
      password: '',
      apiKey: '',
      timeout: 30,
      maxResults: 50,
      useSSL: true,
    },
  });

  useEffect(() => {
    if (isOpen && provider) {
      const currentSettings = provider.settings ?? {};
      form.reset({
        username: currentSettings.username ?? '',
        password: currentSettings.password ?? '',
        apiKey: currentSettings.apiKey ?? '',
        timeout: currentSettings.timeout ?? 30,
        maxResults: currentSettings.maxResults ?? 50,
        useSSL: currentSettings.useSSL ?? true,
      });
    }
  }, [isOpen, provider, form]);

  const handleSave = async (data: SettingsFormValues) => {
    if (!provider) return;
    const settings: ProviderSettings = {};
    if (data.username) settings.username = data.username;
    if (data.password) settings.password = data.password;
    if (data.apiKey) settings.apiKey = data.apiKey;
    if (data.timeout !== undefined) settings.timeout = data.timeout;
    if (data.maxResults !== undefined) settings.maxResults = data.maxResults;
    if (data.useSSL !== undefined) settings.useSSL = data.useSSL;
    await onSave(provider.id, settings);
    onClose();
  };

  const handleTest = async () => {
    if (!provider) return;
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
    if (!provider) return;
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    setIsResetting(true);
    try {
      const resetProvider = await onReset(provider.id);
      form.reset({
        username: resetProvider.settings?.username ?? '',
        password: resetProvider.settings?.password ?? '',
        apiKey: resetProvider.settings?.apiKey ?? '',
        timeout: resetProvider.settings?.timeout ?? 30,
        maxResults: resetProvider.settings?.maxResults ?? 50,
        useSSL: resetProvider.settings?.useSSL ?? true,
      });
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Failed to reset provider:', error);
    } finally {
      setIsResetting(false);
    }
  };

  if (!provider) {
    return null;
  }

  const renderProviderFields = () => {
    switch (provider.type.toLowerCase()) {
      case 'opensubtitles':
        return (
          <>
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium">Username</label>
              <Input
                id="username"
                placeholder="OpenSubtitles username"
                {...form.register('username')}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-status-error">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="OpenSubtitles password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-status-error">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="apiKey" className="text-sm font-medium">API Key (Optional)</label>
              <p className="text-xs text-text-secondary">Not required for all users</p>
              <Input
                id="apiKey"
                type="password"
                placeholder="OpenSubtitles API key"
                {...form.register('apiKey')}
              />
            </div>
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
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium">Username</label>
              <Input
                id="username"
                placeholder="Addic7ed username"
                {...form.register('username')}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-status-error">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="Addic7ed password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-status-error">{form.formState.errors.password.message}</p>
              )}
            </div>
          </>
        );

      case 'generic':
      default:
        return (
          <>
            <div className="space-y-1.5">
              <label htmlFor="apiKey" className="text-sm font-medium">API Key</label>
              <p className="text-xs text-text-secondary">Required for most generic providers</p>
              <Input
                id="apiKey"
                type="password"
                placeholder="Provider API key"
                {...form.register('apiKey')}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="timeout" className="text-sm font-medium">Timeout (seconds)</label>
              <p className="text-xs text-text-secondary">Connection timeout duration</p>
              <NumberInput
                id="timeout"
                value={form.watch('timeout') ?? 30}
                onChange={(v) => form.setValue('timeout', v)}
                min={5}
                max={120}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="maxResults" className="text-sm font-medium">Max Results</label>
              <p className="text-xs text-text-secondary">Maximum search results to return</p>
              <NumberInput
                id="maxResults"
                value={form.watch('maxResults') ?? 50}
                onChange={(v) => form.setValue('maxResults', v)}
                min={1}
                max={200}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="useSSL"
                checked={form.watch('useSSL') ?? true}
                onChange={(checked) => form.setValue('useSSL', checked)}
                label="Enable SSL"
              />
            </div>
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
        <form id="provider-settings-form" onSubmit={(e) => { e.preventDefault(); void handleSave(form.getValues()); }} className="space-y-4">
          {renderProviderFields()}
          <TestResultDisplay result={testResult} isTesting={isTesting} />
        </form>
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
              type="submit"
              form="provider-settings-form"
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
