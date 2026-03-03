import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { EmptyPanel } from './EmptyPanel';
import { ErrorPanel } from './ErrorPanel';
import { SkeletonBlock } from './SkeletonBlock';
export function QueryPanel({ isLoading, isError, isEmpty, errorMessage, onRetry, emptyTitle, emptyBody, children, }) {
    if (isLoading) {
        return (_jsxs("div", { className: "space-y-2", children: [_jsx(SkeletonBlock, { className: "h-4 w-44", ariaLabel: "loading heading" }), _jsx(SkeletonBlock, { className: "h-24 w-full", ariaLabel: "loading table" })] }));
    }
    if (isError) {
        return (_jsx(ErrorPanel, { title: "Could not load data", body: errorMessage ?? 'An unexpected error occurred.', onRetry: onRetry }));
    }
    if (isEmpty) {
        return _jsx(EmptyPanel, { title: emptyTitle, body: emptyBody });
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=QueryPanel.js.map