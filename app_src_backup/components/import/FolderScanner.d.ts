import type { ScanProgress } from './types';
interface FolderScannerProps {
    scanProgress: ScanProgress;
    onScan: (path: string) => void;
    defaultPath?: string;
}
export declare function FolderScanner({ scanProgress, onScan, defaultPath }: FolderScannerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FolderScanner.d.ts.map