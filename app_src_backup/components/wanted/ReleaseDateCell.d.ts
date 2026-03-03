export interface ReleaseDateCellProps {
    cinemaDate?: string;
    digitalDate?: string;
    physicalDate?: string;
}
export declare function formatDate(dateString?: string): string;
export declare function ReleaseDateCell({ cinemaDate, digitalDate, physicalDate }: ReleaseDateCellProps): import("react/jsx-runtime").JSX.Element;
export declare namespace ReleaseDateCell {
    var formatDate: typeof import("./ReleaseDateCell.js").formatDate;
}
//# sourceMappingURL=ReleaseDateCell.d.ts.map