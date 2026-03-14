
import { useEffect, useState } from 'react';
import { type ProviderTestResult } from '@/lib/api';
import { Icon } from '@/components/primitives/Icon';
import { Alert } from '@/components/primitives/Alert';

export interface ProviderTestResultProps {
  result: ProviderTestResult | null;
  isTesting: boolean;
}

export function ProviderTestResult({ result, isTesting }: ProviderTestResultProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (result) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  if (!visible && !isTesting) {
    return null;
  }

  if (isTesting) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Icon name="refresh" label="Testing" className="animate-spin" />
        <span>Testing connection...</span>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <Alert variant={result.success ? 'success' : 'danger'}>
      <div className="flex items-center gap-2">
        <Icon name={result.success ? 'success' : 'danger'} label={result.success ? 'Success' : 'Error'} />
        <span>{result.message}</span>
      </div>
    </Alert>
  );
}
