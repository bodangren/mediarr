import type { MissingEpisode } from '@/types/wanted';
export interface MissingTabProps {
    onSearchEpisode: (episode: MissingEpisode) => void;
    onBulkSearch: (episodes: MissingEpisode[]) => void;
}
export declare function MissingTab({ onSearchEpisode, onBulkSearch }: MissingTabProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MissingTab.d.ts.map