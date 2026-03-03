import type { SubtitleProvider } from '@/lib/api';
export interface ProviderStatusBadgeProps {
    status: 'active' | 'error' | 'disabled';
    lastError?: string;
    provider?: SubtitleProvider;
}
export declare function ProviderStatusBadge({ status, lastError, provider }: ProviderStatusBadgeProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ProviderStatusBadge.d.ts.map