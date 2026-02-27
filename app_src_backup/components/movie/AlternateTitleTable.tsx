'use client';

import type { AlternateTitle } from '@/types/movie';

export interface AlternateTitleTableProps {
  titles: AlternateTitle[];
}

export function AlternateTitleTable({ titles }: AlternateTitleTableProps) {
  if (titles.length === 0) {
    return (
      <div className="rounded-sm border border-border-subtle bg-surface-1 px-4 py-8 text-center">
        <p className="text-text-secondary">No alternate titles found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border-subtle">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface-2 text-text-secondary">
          <tr>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-surface-1">
          {titles.map((title, index) => (
            <tr key={index} className="hover:bg-surface-2/50">
              <td className="px-4 py-2">{title.title}</td>
              <td className="px-4 py-2">
                <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs">{title.source}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
