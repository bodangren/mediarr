import type { HTMLAttributes } from 'react';
export interface LanguageBadgeProps extends HTMLAttributes<HTMLSpanElement> {
    languageCode: string;
    variant: 'available' | 'missing' | 'searching';
    isForced?: boolean;
    isHi?: boolean;
    onClick?: () => void;
}
export declare function LanguageBadge({ languageCode, variant, isForced, isHi, onClick, className, ...props }: LanguageBadgeProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=LanguageBadge.d.ts.map