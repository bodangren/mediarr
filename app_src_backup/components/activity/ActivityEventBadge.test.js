import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityEventBadge } from '@/components/activity/ActivityEventBadge';
describe('ActivityEventBadge', () => {
    describe('Movie events', () => {
        it('renders MOVIE_GRABBED with primary color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "MOVIE_GRABBED" }));
            const badge = screen.getByText('Grabbed');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-accent-primary/20', 'text-accent-primary');
        });
        it('renders MOVIE_DOWNLOADED with info color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "MOVIE_DOWNLOADED" }));
            const badge = screen.getByText('Downloaded');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-accent-info/20', 'text-accent-info');
        });
        it('renders MOVIE_IMPORTED with success color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "MOVIE_IMPORTED" }));
            const badge = screen.getByText('Imported');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-status-completed/20', 'text-status-completed');
        });
        it('renders MOVIE_FILE_DELETED with error color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "MOVIE_FILE_DELETED" }));
            const badge = screen.getByText('File Deleted');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-status-error/20', 'text-status-error');
        });
        it('renders MOVIE_RENAMED with info color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "MOVIE_RENAMED" }));
            const badge = screen.getByText('Renamed');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-accent-info/20', 'text-accent-info');
        });
        it('renders DOWNLOAD_FAILED with error color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "DOWNLOAD_FAILED" }));
            const badge = screen.getByText('Failed');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-status-error/20', 'text-status-error');
        });
    });
    describe('TV/Series events', () => {
        it('renders RELEASE_GRABBED with primary color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "RELEASE_GRABBED" }));
            const badge = screen.getByText('Grabbed');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-accent-primary/20', 'text-accent-primary');
        });
        it('renders SERIES_DOWNLOADED with info color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "SERIES_DOWNLOADED" }));
            const badge = screen.getByText('Downloaded');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-accent-info/20', 'text-accent-info');
        });
        it('renders SERIES_IMPORTED with success color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "SERIES_IMPORTED" }));
            const badge = screen.getByText('Imported');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-status-completed/20', 'text-status-completed');
        });
    });
    describe('General events', () => {
        it('renders INDEXER_QUERY with neutral color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "INDEXER_QUERY" }));
            const badge = screen.getByText('Query');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-surface-2', 'text-text-secondary');
        });
        it('renders INDEXER_RSS with neutral color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "INDEXER_RSS" }));
            const badge = screen.getByText('RSS');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-surface-2', 'text-text-secondary');
        });
        it('renders INDEXER_AUTH with error color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "INDEXER_AUTH" }));
            const badge = screen.getByText('Auth');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-status-error/20', 'text-status-error');
        });
    });
    describe('Unknown events', () => {
        it('renders unknown event type with neutral color', () => {
            render(_jsx(ActivityEventBadge, { eventType: "UNKNOWN_EVENT_TYPE" }));
            const badge = screen.getByText('UNKNOWN_EVENT_TYPE');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-surface-2', 'text-text-secondary');
        });
    });
    it('includes title attribute with event type', () => {
        render(_jsx(ActivityEventBadge, { eventType: "MOVIE_GRABBED" }));
        const badge = screen.getByText('Grabbed');
        expect(badge).toHaveAttribute('title', 'MOVIE_GRABBED');
    });
});
//# sourceMappingURL=ActivityEventBadge.test.js.map