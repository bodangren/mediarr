'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';
export function ShellLayout({ children }) {
    const pathname = usePathname();
    return _jsx(AppShell, { pathname: pathname, children: children });
}
//# sourceMappingURL=ShellLayout.js.map