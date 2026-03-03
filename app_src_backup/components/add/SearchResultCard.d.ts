export interface SearchResultCardProps {
    title: string;
    year?: number;
    overview?: string;
    network?: string;
    status?: string;
    posterUrl?: string;
    tmdbId?: number;
    tvdbId?: number;
    mediaType: 'MOVIE' | 'TV';
    isSelected: boolean;
    alreadyAdded: boolean;
    onSelect: () => void;
}
export declare function SearchResultCard({ title, year, overview, network, status, posterUrl, isSelected, alreadyAdded, onSelect, }: SearchResultCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SearchResultCard.d.ts.map