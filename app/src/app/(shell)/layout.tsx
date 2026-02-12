import type { ReactNode } from 'react';
import { ShellLayout } from '@/components/shell/ShellLayout';

export default function RoutedShellLayout({ children }: { children: ReactNode }) {
  return <ShellLayout>{children}</ShellLayout>;
}
