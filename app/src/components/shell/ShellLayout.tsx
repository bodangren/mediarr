
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppShell } from './AppShell';

export function ShellLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <AppShell pathname={pathname}>{children}</AppShell>;
}
