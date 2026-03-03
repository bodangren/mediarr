import { jsx as _jsx } from "react/jsx-runtime";
import { Archive, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, CircleX, Code, Database, Download, Edit, FileEdit, Folder, GitCommit, Grid3X3, HardDrive, Heart, History, Info, LayoutList, List, Monitor, Package, Play, Plus, RefreshCw, Search, Settings, Star, Tag, Trash2, User, } from 'lucide-react';
const ICON_MAP = {
    search: Search,
    plus: Plus,
    add: Plus,
    settings: Settings,
    refresh: RefreshCw,
    success: CheckCircle2,
    warning: CircleAlert,
    danger: CircleX,
    health: Heart,
    info: Info,
    disk: HardDrive,
    database: Database,
    package: Package,
    backup: Archive,
    tag: Tag,
    code: Code,
    download: Download,
    history: History,
    commit: GitCommit,
    trash: Trash2,
    edit: Edit,
    play: Play,
    grid: Grid3X3,
    list: List,
    'chevron-up': ChevronUp,
    'chevron-down': ChevronDown,
    'chevron-left': ChevronLeft,
    'chevron-right': ChevronRight,
    folder: Folder,
    'file-edit': FileEdit,
    star: Star,
    user: User,
    monitor: Monitor,
    check: CheckSquare,
};
export function Icon({ name, label, ...props }) {
    const LucideIcon = ICON_MAP[name];
    return _jsx(LucideIcon, { "aria-label": label, "aria-hidden": label ? undefined : true, size: 16, ...props });
}
//# sourceMappingURL=Icon.js.map