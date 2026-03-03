interface TablePagerProps {
    page: number;
    totalPages: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPrev: () => void;
    onNext: () => void;
    onPageSizeChange?: (pageSize: number) => void;
}
export declare function TablePager({ page, totalPages, pageSize, pageSizeOptions, onPrev, onNext, onPageSizeChange, }: TablePagerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TablePager.d.ts.map