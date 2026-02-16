import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleX,
  Code,
  Database,
  Download,
  Edit,
  GitCommit,
  Grid3X3,
  HardDrive,
  Heart,
  History,
  Info,
  LayoutList,
  List,
  Package,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Tag,
  Trash2,
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
  | 'chevron-down';

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
} as const;

export function Icon({ name, label, ...props }: IconProps) {
  const LucideIcon = ICON_MAP[name];

  return <LucideIcon aria-label={label} aria-hidden={label ? undefined : true} size={16} {...props} />;
}
