import {
  CheckCircle2,
  CircleAlert,
  CircleX,
  Plus,
  RefreshCw,
  Search,
  Settings,
  type LucideProps,
} from 'lucide-react';

type IconName = 'search' | 'plus' | 'settings' | 'refresh' | 'success' | 'warning' | 'danger';

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  label?: string;
}

const ICON_MAP = {
  search: Search,
  plus: Plus,
  settings: Settings,
  refresh: RefreshCw,
  success: CheckCircle2,
  warning: CircleAlert,
  danger: CircleX,
} as const;

export function Icon({ name, label, ...props }: IconProps) {
  const LucideIcon = ICON_MAP[name];

  return <LucideIcon aria-label={label} aria-hidden={label ? undefined : true} size={16} {...props} />;
}
