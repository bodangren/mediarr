'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from './AppShell';

export function ShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <AppShell pathname={pathname}>{children}</AppShell>;
}
