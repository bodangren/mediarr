import { jsx as _jsx } from "react/jsx-runtime";
import { Geist, Geist_Mono } from 'next/font/google';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';
const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});
const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});
export const metadata = {
    title: 'Mediarr',
    description: 'Unified media operations console',
};
export default function RootLayout({ children, }) {
    return (_jsx("html", { lang: "en", children: _jsx("body", { className: `${geistSans.variable} ${geistMono.variable} font-sans antialiased`, children: _jsx(AppProviders, { children: children }) }) }));
}
//# sourceMappingURL=layout.js.map