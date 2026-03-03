import type { ImportConfig } from './types';
interface ImportConfigPanelProps {
    config: ImportConfig;
    onChange: (config: ImportConfig) => void;
    rootFolders: string[];
}
export declare function ImportConfigPanel({ config, onChange, rootFolders }: ImportConfigPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ImportConfigPanel.d.ts.map