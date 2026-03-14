
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type {
  CustomFormatCondition,
  ConditionType,
  ConditionOperator,
  ConditionField,
} from '@/types/customFormat';
import {
  CONDITION_TYPES,
  OPERATORS,
  FIELDS,
  getOperatorsForType,
  createDefaultCondition,
} from '@/types/customFormat';

interface ConditionBuilderProps {
  conditions: CustomFormatCondition[];
  onChange: (conditions: CustomFormatCondition[]) => void;
  disabled?: boolean;
}

export function ConditionBuilder({
  conditions,
  onChange,
  disabled = false,
}: ConditionBuilderProps) {
  const handleAddCondition = useCallback(() => {
    onChange([...conditions, createDefaultCondition()]);
  }, [conditions, onChange]);

  const handleRemoveCondition = useCallback((index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  }, [conditions, onChange]);

  const handleUpdateCondition = useCallback((
    index: number,
    updates: Partial<CustomFormatCondition>,
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange(newConditions);
  }, [conditions, onChange]);

  const handleToggleNegate = useCallback((index: number) => {
    const newConditions = [...conditions];
    newConditions[index] = {
      ...newConditions[index],
      negate: !newConditions[index].negate,
    };
    onChange(newConditions);
  }, [conditions, onChange]);

  const handleToggleRequired = useCallback((index: number) => {
    const newConditions = [...conditions];
    newConditions[index] = {
      ...newConditions[index],
      required: !newConditions[index].required,
    };
    onChange(newConditions);
  }, [conditions, onChange]);

  const getAvailableOperators = (type: ConditionType): ConditionOperator[] => {
    return getOperatorsForType(type);
  };

  const getOperatorsForDisplay = (type: ConditionType) => {
    const available = getAvailableOperators(type);
    return OPERATORS.filter(op => available.includes(op.value));
  };

  const renderValueInput = (condition: CustomFormatCondition, index: number) => {
    const { type, value } = condition;

    if (type === 'size') {
      // Size in bytes - allow number input with GB/MB conversion hint
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-32 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50"
            value={typeof value === 'number' ? value : 0}
            onChange={(e) => handleUpdateCondition(index, {
              value: Number.parseInt(e.target.value, 10) || 0,
            })}
            placeholder="Bytes"
            disabled={disabled}
          />
          <span className="text-xs text-text-muted whitespace-nowrap">
            (~{(typeof value === 'number' ? value / 1073741824 : 0).toFixed(2)} GB)
          </span>
        </div>
      );
    }

    if (type === 'resolution') {
      // Resolution as number (e.g., 1080, 720, 2160)
      return (
        <input
          type="number"
          className="w-32 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50"
          value={typeof value === 'number' ? value : 0}
          onChange={(e) => handleUpdateCondition(index, {
            value: Number.parseInt(e.target.value, 10) || 0,
          })}
          placeholder="e.g., 1080"
          disabled={disabled}
        />
      );
    }

    // Default: string input
    return (
      <input
        type="text"
        className="flex-1 min-w-0 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50"
        value={typeof value === 'string' ? value : String(value)}
        onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
        placeholder={
          type === 'regex' ? 'e.g., HDR|DV|ATMOS' :
          type === 'language' ? 'e.g., English' :
          type === 'releaseGroup' ? 'e.g., RARBG' :
          type === 'source' ? 'e.g., Bluray' :
          'Enter value...'
        }
        disabled={disabled}
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-text-primary">
          Conditions
        </label>
        <Button
          variant="secondary"
          onClick={handleAddCondition}
          disabled={disabled}
          className="text-xs"
        >
          + Add Condition
        </Button>
      </div>

      {conditions.length === 0 && (
        <div className="rounded-sm border border-dashed border-border-subtle p-4 text-center">
          <p className="text-sm text-text-muted">
            No conditions defined. Add conditions to match releases.
          </p>
        </div>
      )}

      {conditions.length > 0 && (
        <div className="space-y-2">
          {/* Logic hint between conditions */}
          <p className="text-xs text-text-muted">
            All conditions must match (AND logic)
          </p>

          {conditions.map((condition, index) => (
            <div
              key={index}
              className="rounded-sm border border-border-subtle bg-surface-0 p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {/* Condition Type */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Type</label>
                    <select
                      className="w-full rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50"
                      value={condition.type}
                      onChange={(e) => {
                        const newType = e.target.value as ConditionType;
                        const updates: Partial<CustomFormatCondition> = { type: newType };
                        // Reset operator to a valid one for the new type
                        const validOperators = getAvailableOperators(newType);
                        if (!validOperators.includes(condition.operator as ConditionOperator)) {
                          updates.operator = validOperators[0];
                        }
                        handleUpdateCondition(index, updates);
                      }}
                      disabled={disabled}
                    >
                      {CONDITION_TYPES.map(ct => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Field (only for some types) */}
                  {['regex', 'releaseGroup', 'source'].includes(condition.type) && (
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Field</label>
                      <select
                        className="w-full rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50"
                        value={condition.field || 'title'}
                        onChange={(e) => handleUpdateCondition(index, {
                          field: e.target.value as ConditionField,
                        })}
                        disabled={disabled}
                      >
                        {FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Operator */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Operator</label>
                    <select
                      className="w-full rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50"
                      value={condition.operator || 'contains'}
                      onChange={(e) => handleUpdateCondition(index, {
                        operator: e.target.value as ConditionOperator,
                      })}
                      disabled={disabled}
                    >
                      {getOperatorsForDisplay(condition.type).map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Value */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Value</label>
                    {renderValueInput(condition, index)}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(index)}
                  disabled={disabled}
                  className="text-status-error hover:text-status-error/80 disabled:opacity-50 mt-5"
                  aria-label="Remove condition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Negate and Required toggles */}
              <div className="flex items-center gap-4 pl-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={condition.negate || false}
                    onChange={() => handleToggleNegate(index)}
                    disabled={disabled}
                    className="rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
                  />
                  <span className="text-xs text-text-secondary">Negate</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={condition.required || false}
                    onChange={() => handleToggleRequired(index)}
                    disabled={disabled}
                    className="rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
                  />
                  <span className="text-xs text-text-secondary">Required</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
