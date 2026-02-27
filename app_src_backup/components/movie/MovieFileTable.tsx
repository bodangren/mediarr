'use client';

import type { MovieFile } from '@/types/movie';
import { formatFileSize } from '@/types/movie';

export interface MovieFileTableProps {
  files: MovieFile[];
  onEdit?: (file: MovieFile) => void;
  onDelete?: (file: MovieFile) => void;
}

export function MovieFileTable({ files, onEdit, onDelete }: MovieFileTableProps) {
  if (files.length === 0) {
    return (
      <div className="rounded-sm border border-border-subtle bg-surface-1 px-4 py-8 text-center">
        <p className="text-text-secondary">No movie files found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border-subtle">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface-2 text-text-secondary">
          <tr>
            <th className="px-4 py-2">Path</th>
            <th className="px-4 py-2">Quality</th>
            <th className="px-4 py-2">Size</th>
            <th className="px-4 py-2">Language</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-surface-1">
          {files.map(file => (
            <tr key={file.id} className="hover:bg-surface-2/50">
              <td className="px-4 py-2">
                <div className="max-w-md truncate" title={file.path}>
                  {file.path}
                </div>
              </td>
              <td className="px-4 py-2">
                <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs">{file.quality}</span>
              </td>
              <td className="px-4 py-2">{formatFileSize(file.size)}</td>
              <td className="px-4 py-2">{file.language}</td>
              <td className="px-4 py-2 text-right">
                <div className="flex justify-end gap-1">
                  {onEdit && (
                    <button
                      type="button"
                      className="rounded-sm border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2"
                      onClick={() => onEdit(file)}
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="rounded-sm border border-accent-danger/30 px-2 py-1 text-xs text-accent-danger hover:bg-accent-danger/10"
                      onClick={() => onDelete(file)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
