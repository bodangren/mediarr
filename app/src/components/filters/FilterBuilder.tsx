'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FilterCondition, FilterConditionsGroup, FilterField, FilterTargetType } from '@/lib/api/filters';

type BuilderTargetType = FilterTargetType;

const FIELD_OPTIONS: Record<BuilderTargetType, Array<{ value: FilterField; label: string }>> = {
  series: [
    { value: 'monitored', label: 'Monitored' },
    { value: 'network', label: 'Network' },
    { value: 'genre', label: 'Genre' },
    { value: 'tag', label: 'Tag' },
    { value: 'rating', label: 'Rating' },
    { value: 'status', label: 'Status' },
  ],
  indexer: [
    { value: 'protocol', label: 'Protocol' },
    { value: 'enabled', label: 'Enabled' },
    { value: 'capability', label: 'Capability' },
    { value: 'priority', label: 'Priority' },
    { value: 'tag', label: 'Tag' },
  ],
};

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Not contains' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
] as const;

const BOOLEAN_VALUES = [
  { value: 'true', label: 'Enabled / True' },
  { value: 'false', label: 'Disabled / False' },
];

function isBooleanField(field: FilterField): boolean {
  return field === 'monitored' || field === 'enabled';
}

function isNumericField(field: FilterField): boolean {
  return field === 'rating' || field === 'priority';
}

function defaultFieldForTarget(targetType: BuilderTargetType): FilterField {
  return targetType === 'indexer' ? 'protocol' : 'status';
}

function createCondition(targetType: BuilderTargetType, field?: FilterField): FilterCondition {
  const resolvedField = field ?? defaultFieldForTarget(targetType);

  if (isBooleanField(resolvedField)) {
    return {
      field: resolvedField,
      operator: 'equals',
      value: true,
    };
  }

  if (isNumericField(resolvedField)) {
    return {
      field: resolvedField,
      operator: 'greaterThan',
      value: 0,
    };
  }

  return {
    field: resolvedField,
    operator: 'contains',
    value: '',
  };
}

function normalizeValue(field: FilterField, value: string): string | number | boolean {
  if (isBooleanField(field)) {
    return value === 'true';
  }

  if (isNumericField(field)) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return value;
}

interface FilterBuilderProps {
  isOpen: boolean;
  targetType?: BuilderTargetType;
  activeFilter?: {
    id?: number;
    name: string;
    type?: BuilderTargetType;
    conditions: FilterConditionsGroup;
  } | null;
  onClose: () => void;
  onApply: (conditions: FilterConditionsGroup) => void;
  onSave: (input: { id?: number; name: string; conditions: FilterConditionsGroup }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function FilterBuilder({
  isOpen,
  targetType = 'series',
  activeFilter,
  onClose,
  onApply,
  onSave,
  onDelete,
}: FilterBuilderProps) {
  const resolvedTargetType: BuilderTargetType = activeFilter?.type ?? targetType;

  const [name, setName] = useState('');
  const [operator, setOperator] = useState<'and' | 'or'>('and');
  const [conditions, setConditions] = useState<FilterCondition[]>([createCondition(resolvedTargetType)]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = Boolean(activeFilter?.id);
  const hasName = name.trim().length > 0;
  const hasConditionValues = useMemo(
    () => conditions.every(condition => String(condition.value).trim().length > 0),
    [conditions],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (activeFilter) {
      setName(activeFilter.name);
      setOperator(activeFilter.conditions.operator);
      setConditions(
        activeFilter.conditions.conditions.length > 0
          ? activeFilter.conditions.conditions
          : [createCondition(resolvedTargetType)],
      );
      return;
    }

    setName('');
    setOperator('and');
    setConditions([createCondition(resolvedTargetType)]);
  }, [isOpen, activeFilter, resolvedTargetType]);

  if (!isOpen) {
    return null;
  }

  const applyPayload: FilterConditionsGroup = {
    operator,
    conditions,
  };

  const fieldOptions = FIELD_OPTIONS[resolvedTargetType];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-3/70 px-4">
      <div className="w-full max-w-3xl rounded-md border border-border-subtle bg-surface-1 p-4 shadow-elevation-3">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Custom Filter Builder</h2>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>Filter Name</span>
            <input
              value={name}
              onChange={event => setName(event.currentTarget.value)}
              placeholder={resolvedTargetType === 'indexer' ? 'e.g. Torrent RSS Indexers' : 'e.g. Ongoing Network Shows'}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>Condition Logic</span>
            <select
              value={operator}
              onChange={event => setOperator(event.currentTarget.value as 'and' | 'or')}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
            >
              <option value="and">AND (all conditions)</option>
              <option value="or">OR (any condition)</option>
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-2">
          {conditions.map((condition, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 rounded-sm border border-border-subtle p-2 md:grid-cols-[1fr,1fr,1fr,auto]">
              <label className="flex flex-col gap-1 text-xs text-text-secondary">
                <span>Field</span>
                <select
                  aria-label={`Field ${index + 1}`}
                  value={condition.field}
                  className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  onChange={event => {
                    const field = event.currentTarget.value as FilterField;
                    setConditions(current => {
                      const next = [...current];
                      next[index] = createCondition(resolvedTargetType, field);
                      return next;
                    });
                  }}
                >
                  {fieldOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-text-secondary">
                <span>Operator</span>
                <select
                  aria-label={`Operator ${index + 1}`}
                  value={condition.operator}
                  className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  onChange={event => {
                    const operatorValue = event.currentTarget.value as FilterCondition['operator'];
                    setConditions(current => {
                      const next = [...current];
                      next[index] = {
                        ...condition,
                        operator: operatorValue,
                      };
                      return next;
                    });
                  }}
                >
                  {OPERATOR_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-text-secondary">
                <span>Value</span>
                {isBooleanField(condition.field) ? (
                  <select
                    aria-label={`Value ${index + 1}`}
                    value={String(condition.value)}
                    className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                    onChange={event => {
                      const rawValue = event.currentTarget.value;
                      setConditions(current => {
                        const next = [...current];
                        next[index] = {
                          ...condition,
                          value: normalizeValue(condition.field, rawValue),
                        };
                        return next;
                      });
                    }}
                  >
                    {BOOLEAN_VALUES.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    aria-label={`Value ${index + 1}`}
                    type={isNumericField(condition.field) ? 'number' : 'text'}
                    value={String(condition.value)}
                    className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                    onChange={event => {
                      const rawValue = event.currentTarget.value;
                      setConditions(current => {
                        const next = [...current];
                        next[index] = {
                          ...condition,
                          value: normalizeValue(condition.field, rawValue),
                        };
                        return next;
                      });
                    }}
                  />
                )}
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  className="h-8 rounded-sm border border-border-subtle px-2 text-xs"
                  onClick={() => {
                    if (conditions.length === 1) {
                      return;
                    }

                    setConditions(current => current.filter((_, conditionIndex) => conditionIndex !== index));
                  }}
                  disabled={conditions.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs"
            onClick={() => setConditions(current => [...current, createCondition(resolvedTargetType)])}
          >
            Add Condition
          </button>
          <button
            type="button"
            className="rounded-sm border border-accent-primary px-3 py-1.5 text-xs"
            disabled={!hasConditionValues}
            onClick={() => onApply(applyPayload)}
          >
            Apply
          </button>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs"
            disabled={!hasName || !hasConditionValues || isSaving}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onSave({
                  id: activeFilter?.id,
                  name,
                  conditions: applyPayload,
                });
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {activeFilter ? 'Update Filter' : 'Save Filter'}
          </button>
          <button
            type="button"
            className="rounded-sm border border-status-error/60 px-3 py-1.5 text-xs text-status-error"
            disabled={!canDelete || isDeleting}
            onClick={async () => {
              if (!activeFilter?.id) {
                return;
              }

              setIsDeleting(true);
              try {
                await onDelete(activeFilter.id);
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            Delete Filter
          </button>
        </div>
      </div>
    </div>
  );
}
