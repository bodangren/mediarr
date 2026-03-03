import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { UI_STATE_STORAGE_KEY } from './uiStore';
import { useUIStore } from './useUIStore';
function StoreProbe() {
    const { state, toggleSidebarCollapsed, setSidebarCollapsed } = useUIStore();
    return (_jsxs("div", { children: [_jsx("p", { "data-testid": "sidebar-collapsed", children: String(state.sidebarCollapsed) }), _jsx("button", { type: "button", onClick: toggleSidebarCollapsed, children: "Toggle" }), _jsx("button", { type: "button", onClick: () => setSidebarCollapsed(false), children: "Set False" })] }));
}
describe('useUIStore', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });
    it('hydrates initial state from localStorage when available', () => {
        window.localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify({ sidebarCollapsed: true }));
        render(_jsx(StoreProbe, {}));
        expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    });
    it('updates state and persists sidebar collapsed changes', () => {
        render(_jsx(StoreProbe, {}));
        expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
        fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
        expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
        expect(window.localStorage.getItem(UI_STATE_STORAGE_KEY)).toBe(JSON.stringify({ sidebarCollapsed: true }));
        fireEvent.click(screen.getByRole('button', { name: 'Set False' }));
        expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
        expect(window.localStorage.getItem(UI_STATE_STORAGE_KEY)).toBe(JSON.stringify({ sidebarCollapsed: false }));
    });
});
//# sourceMappingURL=useUIStore.test.js.map