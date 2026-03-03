import { type LucideProps } from 'lucide-react';
type IconName = 'search' | 'plus' | 'add' | 'settings' | 'refresh' | 'success' | 'warning' | 'danger' | 'health' | 'info' | 'disk' | 'database' | 'package' | 'backup' | 'tag' | 'code' | 'download' | 'history' | 'commit' | 'trash' | 'edit' | 'play' | 'grid' | 'list' | 'chevron-up' | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'folder' | 'file-edit' | 'star' | 'user' | 'monitor' | 'check';
interface IconProps extends Omit<LucideProps, 'ref'> {
    name: IconName;
    label?: string;
}
export declare function Icon({ name, label, ...props }: IconProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Icon.d.ts.map