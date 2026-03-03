import type React from 'react';
export interface TestConnectionResult {
    success: boolean;
    message: string;
    hints?: string[];
}
export interface PresetBase {
    id: string;
}
export interface ConfigurableItemModalProps<TPreset extends PresetBase, TFieldValues> {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    presets: TPreset[];
    selectedPresetId?: string;
    fieldValues: TFieldValues;
    isSubmitting?: boolean;
    isTesting?: boolean;
    testResult?: TestConnectionResult | null;
    error?: string | null;
    saveButtonText?: string;
    renderPresetGrid: (presets: TPreset[], selectedId: string | undefined, onSelect: (id: string) => void) => React.ReactNode;
    renderFields: (preset: TPreset | undefined, values: TFieldValues, onChange: (field: string, value: unknown) => void) => React.ReactNode;
    onSelectPreset: (presetId: string) => void;
    onFieldChange: (field: string, value: unknown) => void;
    onTestConnection: () => void;
    onSave: () => void;
}
export declare function ConfigurableItemModal<TPreset extends PresetBase, TFieldValues>({ isOpen, onClose, title, presets, selectedPresetId, fieldValues, isSubmitting, isTesting, testResult, error, saveButtonText, renderPresetGrid, renderFields, onSelectPreset, onFieldChange, onTestConnection, onSave, }: ConfigurableItemModalProps<TPreset, TFieldValues>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ConfigurableItemModal.d.ts.map