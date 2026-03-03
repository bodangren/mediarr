import { type UIAction } from './uiStore';
export declare function useUIStore(): {
    state: UIState;
    dispatch: (action: UIAction) => void;
    setSidebarCollapsed(value: boolean): void;
    toggleSidebarCollapsed(): void;
};
//# sourceMappingURL=useUIStore.d.ts.map