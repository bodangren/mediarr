import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';
export default function ActivityLoading() {
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(SkeletonBlock, { className: "h-5 w-36", ariaLabel: "loading activity heading" }), _jsx(SkeletonBlock, { className: "h-20 w-full", ariaLabel: "loading activity rows" })] }));
}
//# sourceMappingURL=loading.js.map