import type { ImportList, ImportListExclusion, CreateImportListInput, CreateExclusionInput } from '@/lib/api/importListsApi';
import type { QualityProfile } from '@/types/qualityProfile';
type TabType = 'lists' | 'exclusions';
interface ImportListSettingsProps {
    lists: ImportList[];
    exclusions: ImportListExclusion[];
    qualityProfiles: QualityProfile[];
    isLoadingLists: boolean;
    isLoadingExclusions: boolean;
    listsError: Error | null;
    exclusionsError: Error | null;
    onCreateList: (input: CreateImportListInput) => Promise<void>;
    onUpdateList: (id: number, input: CreateImportListInput) => Promise<void>;
    onDeleteList: (id: number) => Promise<void>;
    onSyncList: (id: number) => Promise<void>;
    onCreateExclusion: (input: CreateExclusionInput) => Promise<void>;
    onDeleteExclusion: (id: number) => Promise<void>;
    onRefreshLists: () => void;
    onRefreshExclusions: () => void;
    title?: string;
    description?: string;
    defaultTab?: TabType;
}
export declare function ImportListSettings({ lists, exclusions, qualityProfiles, isLoadingLists, isLoadingExclusions, listsError, exclusionsError, onCreateList, onUpdateList, onDeleteList, onSyncList, onCreateExclusion, onDeleteExclusion, onRefreshLists, onRefreshExclusions, title, description, defaultTab, }: ImportListSettingsProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ImportListSettings.d.ts.map