'use client';

import { useState } from 'react';

export type FilterConditionOperator = 'contains' | 'equals' | 'gt';

export interface FilterFieldOption {
  key: string;
  label: string;
}

export interface FilterConditionInput {
  field: string;
  operator: FilterConditionOperator;
  value: string;
}

export interface FilterBuilderResult {
  operator: 'and' | 'or';
  conditions: FilterConditionInput[];
}

interface FilterBuilderProps {
  fields: FilterFieldOption[];
  onApply: (result: FilterBuilderResult) => void;
}

function createEmptyCondition(field: string): FilterConditionInput {
  return {
    field,
    operator: 'contains',
    value: '',
  };
}

export function FilterBuilder({ fields, onApply }: FilterBuilderProps) {
  const [operator, setOperator] = useState<'and' | 'or'>('and');
  const [conditions, setConditions] = useState<FilterConditionInput[]>([createEmptyCondition(fields[0]?.key ?? 'value')]);

  return (
    <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-3">
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        <span>Group operator</span>
        <select
          aria-label="Group operator"
          value={operator}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs text-text-primary"
          onChange={event => setOperator(event.currentTarget.value as 'and' | 'or')}
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      </label>

      {conditions.map((condition, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>{`Field ${index + 1}`}</span>
            <select
              aria-label={`Field ${index + 1}`}
              value={condition.field}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs text-text-primary"
              onChange={event => {
                const next = [...conditions];
                next[index] = { ...condition, field: event.currentTarget.value };
                setConditions(next);
              }}
            >
              {fields.map(field => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>{`Operator ${index + 1}`}</span>
            <select
              aria-label={`Operator ${index + 1}`}
              value={condition.operator}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs text-text-primary"
              onChange={event => {
                const next = [...conditions];
                next[index] = { ...condition, operator: event.currentTarget.value as FilterConditionOperator };
                setConditions(next);
              }}
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              <option value="gt">greater than</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>{`Value ${index + 1}`}</span>
            <input
              aria-label={`Value ${index + 1}`}
              value={condition.value}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs text-text-primary"
              onChange={event => {
                const next = [...conditions];
                next[index] = { ...condition, value: event.currentTarget.value };
                setConditions(next);
              }}
            />
          </label>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary"
          onClick={() => setConditions(current => [...current, createEmptyCondition(fields[0]?.key ?? 'value')])}
        >
          Add condition
        </button>
        <button
          type="button"
          className="rounded-sm border border-accent-primary px-2 py-1 text-xs text-text-primary"
          onClick={() =>
            onApply({
              operator,
              conditions,
            })
          }
        >
          Apply filters
        </button>
      </div>
    </section>
  );
}
