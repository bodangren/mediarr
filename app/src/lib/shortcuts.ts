export interface KeyboardShortcutDefinition {
  id: string;
  keyCombo: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcutDefinition[] = [
  {
    id: 'command-palette',
    keyCombo: 'Cmd/Ctrl + K',
    description: 'Open or close the command palette.',
  },
  {
    id: 'shortcuts-help',
    keyCombo: '?',
    description: 'Open keyboard shortcuts help.',
  },
  {
    id: 'close-overlays',
    keyCombo: 'Esc',
    description: 'Close open overlays like dialogs and palettes.',
  },
  {
    id: 'save',
    keyCombo: 'Cmd/Ctrl + S',
    description: 'Save settings on pages that support save shortcuts.',
  },
];

export const SHORTCUT_SAVE_EVENT = 'mediarr:shortcut-save';

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

export function isQuestionMarkShortcut(event: KeyboardEvent): boolean {
  return event.key === '?' || (event.key === '/' && event.shiftKey);
}

export function emitShortcutSaveEvent(target: Window = window): void {
  target.dispatchEvent(new CustomEvent(SHORTCUT_SAVE_EVENT));
}

export function addShortcutSaveListener(listener: () => void, target: Window = window): () => void {
  const wrapped = () => listener();
  target.addEventListener(SHORTCUT_SAVE_EVENT, wrapped);
  return () => {
    target.removeEventListener(SHORTCUT_SAVE_EVENT, wrapped);
  };
}
