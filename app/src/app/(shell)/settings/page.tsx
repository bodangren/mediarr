'use client';

import Link from 'next/link';
import { SettingsForm } from './settings-form';

const SETTINGS_LINKS = [
  { href: '/settings/indexers', label: 'Indexers' },
  { href: '/settings/general', label: 'General' },
  { href: '/settings/ui', label: 'UI' },
] as const;

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-text-secondary">Manage global application preferences and keys.</p>
      </header>
      <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
        {SETTINGS_LINKS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1 text-sm text-text-primary hover:bg-surface-2"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <SettingsForm />
    </section>
  );
}
