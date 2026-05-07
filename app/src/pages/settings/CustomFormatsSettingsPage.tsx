import { useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { CustomFormatModal } from '@/components/settings/CustomFormatModal';
import { FormatLiveTester } from '@/components/settings/FormatLiveTester';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiClients } from '@/lib/api/client';
import type { CustomFormat, CreateCustomFormatInput, UpdateCustomFormatInput } from '@/types/customFormat';

export function CustomFormatsSettingsPage() {
  const api = useMemo(() => getApiClients(), []);
  const [formats, setFormats] = useState<CustomFormat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFormat, setEditingFormat] = useState<CustomFormat | null>(null);
  const [testingFormat, setTestingFormat] = useState<CustomFormat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.customFormatApi.list();
      setFormats(data as CustomFormat[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load custom formats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  const filteredFormats = useMemo(() => {
    if (!searchQuery.trim()) return formats;
    const query = searchQuery.toLowerCase();
    return formats.filter(format =>
      format.name.toLowerCase().includes(query)
    );
  }, [formats, searchQuery]);

  const handleCreate = async (data: CreateCustomFormatInput | UpdateCustomFormatInput) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.customFormatApi.create(data as CreateCustomFormatInput);
      setIsModalOpen(false);
      await load();
      setMessage(`Created custom format "${data.name}".`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create custom format');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: CreateCustomFormatInput | UpdateCustomFormatInput) => {
    if (!editingFormat) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.customFormatApi.update(editingFormat.id, data as UpdateCustomFormatInput);
      setEditingFormat(null);
      await load();
      setMessage(`Updated custom format "${data.name}".`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update custom format');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (format: CustomFormat) => {
    const confirmed = window.confirm(`Delete custom format "${format.name}"?`);
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.customFormatApi.delete(format.id);
      await load();
      setMessage(`Deleted custom format "${format.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete custom format');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClone = (format: CustomFormat) => {
    setEditingFormat(null);
    setIsModalOpen(true);
    setMessage(`Cloning "${format.name}" — adjust the name and save.`);
  };

  const openCreateModal = () => {
    setEditingFormat(null);
    setIsModalOpen(true);
  };

  const openEditModal = (format: CustomFormat) => {
    setEditingFormat(format);
    setIsModalOpen(true);
  };

  const openTestPanel = (format: CustomFormat) => {
    setTestingFormat(testingFormat?.id === format.id ? null : format);
  };

  return (
    <RouteScaffold
      title="Custom Formats"
      description="Define scoring rules that determine which releases win during auto-search and RSS sync."
    >
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {isLoading ? <p className="text-sm text-text-secondary">Loading custom formats...</p> : null}

      <div className="space-y-4">
        {/* Search and Add */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search formats..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={openCreateModal} disabled={isSaving}>
            + Add Custom Format
          </Button>
        </div>

        {/* Formats Table */}
        <div className="rounded-md border border-border-subtle bg-surface-1 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-0 border-b border-border-subtle">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Name</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Conditions</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Scores</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            {filteredFormats.length === 0 ? (
              <tbody className="divide-y divide-border-subtle">
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                    {searchQuery ? 'No formats match your search.' : 'No custom formats found.'}
                  </td>
                </tr>
              </tbody>
            ) : (
              filteredFormats.map(format => (
                <tbody key={format.id} className="divide-y divide-border-subtle">
                    <tr className="hover:bg-surface-0/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-text-primary">{format.name}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {format.conditions.length}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {format.scores.length}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => openTestPanel(format)}
                            disabled={isSaving}
                          >
                            {testingFormat?.id === format.id ? 'Hide Test' : 'Test'}
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleClone(format)}
                            disabled={isSaving}
                          >
                            Clone
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => openEditModal(format)}
                            disabled={isSaving}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => handleDelete(format)}
                            disabled={isSaving}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {testingFormat?.id === format.id && (
                      <tr className="bg-surface-0/30">
                        <td colSpan={4} className="px-4 py-4">
                          <div className="rounded-sm border border-border-subtle bg-surface-0 p-4 space-y-3">
                            <h4 className="text-sm font-medium text-text-primary">
                              Live Tester: {format.name}
                            </h4>
                            <FormatLiveTester
                              format={format}
                              onTest={api.customFormatApi.test}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                ))
              )}
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CustomFormatModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFormat(null);
        }}
        onSave={editingFormat ? handleUpdate : handleCreate}
        editFormat={editingFormat ?? undefined}
        isLoading={isSaving}
      />
    </RouteScaffold>
  );
}
