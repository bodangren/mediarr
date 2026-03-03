import type { ImportListExclusion } from '@/lib/api/importListsApi';
interface ExclusionManagerProps {
    exclusions: ImportListExclusion[];
    isLoading: boolean;
    error: Error | null;
    onAddExclusion: () => void;
    onRemoveExclusion: (exclusion: ImportListExclusion) => void;
    isDeleting: boolean;
}
export declare function ExclusionManager({ exclusions, isLoading, error, onAddExclusion, onRemoveExclusion, isDeleting, }: ExclusionManagerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ExclusionManager.d.ts.map