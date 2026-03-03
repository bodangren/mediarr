import type { LanguageSetting } from '@/lib/api/languageProfilesApi';
export interface LanguageSettingRowProps {
    setting: LanguageSetting;
    onChange: (setting: LanguageSetting) => void;
    onRemove: () => void;
    disabled?: boolean;
}
export declare function LanguageSettingRow({ setting, onChange, onRemove, disabled, }: LanguageSettingRowProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=LanguageSettingRow.d.ts.map