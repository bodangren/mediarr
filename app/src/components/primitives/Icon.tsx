import {
  Archive,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleX,
  Code,
  Database,
  Download,
  Edit,
  FileEdit,
  Folder,
  GitCommit,
  Grid3X3,
  HardDrive,
  Heart,
  History,
  Info,
  LayoutList,
  List,
  Monitor,
  Package,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
  User,
  type LucideProps,
} from 'lucide-react';

type IconName =
  | 'search'
  | 'plus'
  | 'add'
  | 'settings'
  | 'refresh'
  | 'success'
  | 'warning'
  | 'danger'
  | 'health'
  | 'info'
  | 'disk'
  | 'database'
  | 'package'
  | 'backup'
  | 'tag'
  | 'code'
  | 'download'
  | 'history'
  | 'commit'
  | 'trash'
  | 'edit'
  | 'play'
  | 'grid'
  | 'list'
  | 'chevron-up'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'folder'
  | 'file-edit'
  | 'star'
  | 'user'
  | 'monitor'
  | 'check';

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  label?: string;
}

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
} as const;

export function Icon({ name, label, ...props }: IconProps) {
  const LucideIcon = ICON_MAP[name];

  return <LucideIcon aria-label={label} aria-hidden={label ? undefined : true} size={16} {...props} />;
}
