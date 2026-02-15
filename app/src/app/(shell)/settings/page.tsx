'use client';

import { SettingsForm } from './settings-form';

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-text-secondary">Manage global application preferences and keys.</p>
      </header>
      <SettingsForm />
    </section>
  );
}
