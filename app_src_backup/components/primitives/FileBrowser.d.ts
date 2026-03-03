export interface FileBrowserItem {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size?: number;
    modified?: Date;
}
interface FileBrowserProps {
    isOpen: boolean;
    title: string;
    initialPath?: string;
    selectFolder?: boolean;
    entries?: FileBrowserItem[];
    onPathChange?: (path: string) => void;
    onSelect: (path: string) => void;
    onCancel: () => void;
}
export declare function FileBrowser({ isOpen, title, initialPath, selectFolder, entries, onPathChange, onSelect, onCancel, }: FileBrowserProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FileBrowser.d.ts.map