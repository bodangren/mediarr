export interface KeyboardShortcutDefinition {
    id: string;
    keyCombo: string;
    description: string;
}
export declare const KEYBOARD_SHORTCUTS: KeyboardShortcutDefinition[];
export declare const SHORTCUT_SAVE_EVENT = "mediarr:shortcut-save";
export declare function isEditableTarget(target: EventTarget | null): boolean;
export declare function isQuestionMarkShortcut(event: KeyboardEvent): boolean;
export declare function emitShortcutSaveEvent(target?: Window): void;
export declare function addShortcutSaveListener(listener: () => void, target?: Window): () => void;
//# sourceMappingURL=shortcuts.d.ts.map