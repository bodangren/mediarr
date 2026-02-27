'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { ConfirmModal } from '@/components/primitives/Modal';
import { CustomFormatModal } from '@/components/settings/CustomFormatModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useToast } from '@/components/providers/ToastProvider';
import type {
  CustomFormat,
  CreateCustomFormatInput,
  UpdateCustomFormatInput,
} from '@/types/customFormat';
import { CONDITION_TYPES } from '@/types/customFormat';

function getConditionTypeLabel(type: string): string {
  const found = CONDITION_TYPES.find(ct => ct.value === type);
  return found?.label ?? type;
}

function formatConditionSummary(conditions: CustomFormat['conditions']): string {
  if (conditions.length === 0) return 'No conditions';
  if (conditions.length === 1) {
    const c = conditions[0];
    return `${getConditionTypeLabel(c.type)}: ${c.value}`;
  }
  return `${conditions.length} conditions`;
}

export default function CustomFormatsPage() {
  const { pushToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFormat, setEditFormat] = useState<CustomFormat | undefined>(undefined);
  const [deleteFormat, setDeleteFormat] = useState<CustomFormat | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const { data: formats = [], isLoading, error, refetch } = useApiQuery<CustomFormat[]>({
    queryKey: queryKeys.customFormats(),
    queryFn: () => getApiClients().customFormatApi.list(),
  });

  const handleAddFormat = async (input: CreateCustomFormatInput) => {
    setIsSaving(true);
    try {
      await getApiClients().customFormatApi.create(input);
      pushToast({
        title: 'Success',
        message: 'Custom format created successfully',
        variant: 'success',
      });
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create custom format';
      pushToast({
        title: 'Error',
        message,
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFormat = async (input: UpdateCustomFormatInput) => {
    if (!editFormat) return;

    setIsSaving(true);
    try {
      await getApiClients().customFormatApi.update(editFormat.id, input);
      pushToast({
        title: 'Success',
        message: 'Custom format updated successfully',
        variant: 'success',
      });
      setIsModalOpen(false);
      setEditFormat(undefined);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update custom format';
      pushToast({
        title: 'Error',
        message,
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFormat = async () => {
    if (!deleteFormat) return;

    setIsSaving(true);
    try {
      await getApiClients().customFormatApi.delete(deleteFormat.id);
      pushToast({
        title: 'Success',
        message: 'Custom format deleted successfully',
        variant: 'success',
      });
      setDeleteFormat(undefined);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete custom format';
      pushToast({
        title: 'Error',
        message,
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setEditFormat(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (format: CustomFormat) => {
    setEditFormat(format);
    setIsModalOpen(true);
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setEditFormat(undefined);
    setDeleteFormat(undefined);
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Custom Formats</h1>
        <p className="text-sm text-text-secondary">
          Create custom formats to match releases based on conditions and assign scores for quality ranking.
        </p>
      </header>

      {/* Add Format Button */}
      <div>
        <Button variant="primary" onClick={openAddModal}>
          Add Custom Format
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="danger">
          <p>Failed to load custom formats. Please try again later.</p>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-sm border border-border-subtle bg-surface-1 p-4">
          <p className="text-sm text-text-secondary">Loading custom formats...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && formats.length === 0 && (
        <Alert variant="info">
          <p>No custom formats configured. Click &quot;Add Custom Format&quot; to create one.</p>
        </Alert>
      )}

      {/* Formats List */}
      {!isLoading && !error && formats.length > 0 && (
        <div className="space-y-3">
          {formats.map(format => (
            <div
              key={format.id}
              className="rounded-sm border border-border-subtle bg-surface-1 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-text-primary">{format.name}</h3>
                    {format.includeCustomFormatWhenRenaming && (
                      <span className="text-xs bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded">
                        Renaming
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>
                      <span className="text-text-muted">Conditions:</span>{' '}
                      <span className="text-text-secondary">{formatConditionSummary(format.conditions)}</span>
                    </div>
                    {format.scores.length > 0 && (
                      <div>
                        <span className="text-text-muted">Quality Profile Scores:</span>{' '}
                        <span className="text-text-secondary">
                          {format.scores.map(s => `Profile ${s.qualityProfileId}: ${s.score}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => openEditModal(format)}
                    className="text-sm"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setDeleteFormat(format)}
                    className="text-sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Condition Details (expandable in future) */}
              {format.conditions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <p className="text-xs text-text-muted mb-2">Condition Details:</p>
                  <div className="flex flex-wrap gap-2">
                    {format.conditions.map((condition, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-surface-0 border border-border-subtle px-2 py-1 rounded"
                      >
                        {condition.negate && <span className="text-accent-warning">!</span>}
                        {getConditionTypeLabel(condition.type)}
                        {condition.operator && (
                          <span className="text-text-muted ml-1">
                            {condition.operator === 'equals' ? '=' :
                             condition.operator === 'contains' ? '~' :
                             condition.operator === 'greaterThan' ? '>' :
                             condition.operator === 'lessThan' ? '<' :
                             condition.operator}
                          </span>
                        )}
                        <span className="text-accent-primary ml-1">
                          {typeof condition.value === 'number' && condition.type === 'size'
                            ? `${(condition.value / 1073741824).toFixed(1)}GB`
                            : String(condition.value)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <CustomFormatModal
        isOpen={isModalOpen}
        onClose={closeModals}
        onSave={editFormat ? handleEditFormat : handleAddFormat}
        editFormat={editFormat}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Modal */}
      {deleteFormat && (
        <ConfirmModal
          isOpen
          title="Delete Custom Format"
          description={
            <div className="space-y-2">
              <p>
                Are you sure you want to delete the custom format <strong>{deleteFormat.name}</strong>?
              </p>
              <p className="text-xs text-text-muted">
                This action cannot be undone. Any quality profile score assignments will also be removed.
              </p>
            </div>
          }
          onCancel={() => setDeleteFormat(undefined)}
          onConfirm={handleDeleteFormat}
          cancelLabel="Cancel"
          confirmLabel="Delete Format"
          confirmVariant="danger"
          isConfirming={isSaving}
        />
      )}
    </section>
  );
}
