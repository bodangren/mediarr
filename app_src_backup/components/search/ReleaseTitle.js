import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useState } from 'react';
export const ReleaseTitle = memo(function ReleaseTitle({ title, maxLines = 2 }) {
    const [expanded, setExpanded] = useState(false);
    // Very long titles can be clipped, but check if it's likely to overflow
    const isLikelyLong = title.length > 60;
    if (!isLikelyLong) {
        return (_jsx("span", { className: "font-mono text-xs break-all", title: title, children: title }));
    }
    return (_jsxs("div", { className: "space-y-1", children: [_jsx("span", { className: `font-mono text-xs break-all ${expanded ? '' : `line-clamp-${maxLines}`}`, title: title, children: title }), _jsx("button", { type: "button", className: "text-xs text-accent-primary hover:underline", onClick: () => setExpanded(!expanded), children: expanded ? 'Show less' : 'Show more' })] }));
});
//# sourceMappingURL=ReleaseTitle.js.map