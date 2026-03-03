/**
 * Test suite for time formatting utilities
 */
import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './time';
describe('formatRelativeTime', () => {
    it('should return "just now" for timestamps less than a minute old', () => {
        const now = new Date();
        const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
        expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
    });
    it('should return "just now" for timestamps less than 60 seconds old', () => {
        const now = new Date();
        const fiftyNineSecondsAgo = new Date(now.getTime() - 59 * 1000);
        expect(formatRelativeTime(fiftyNineSecondsAgo)).toBe('just now');
    });
    it('should return "Xm ago" for timestamps less than an hour old', () => {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        expect(formatRelativeTime(thirtyMinutesAgo)).toBe('30m ago');
    });
    it('should return "Xh ago" for timestamps less than a day old', () => {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        expect(formatRelativeTime(twelveHoursAgo)).toBe('12h ago');
    });
    it('should return "Xd ago" for timestamps less than a week old', () => {
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
        const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(sixDaysAgo)).toBe('6d ago');
    });
    it('should return formatted date for timestamps older than a week', () => {
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const result = formatRelativeTime(twoWeeksAgo);
        // Result should be a date string, not a relative time
        expect(result).not.toMatch(/\d+[mhd] ago$/);
        expect(result).not.toBe('just now');
    });
    it('should handle Date objects', () => {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });
    it('should handle ISO string dates', () => {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        expect(formatRelativeTime(fiveMinutesAgo.toISOString())).toBe('5m ago');
    });
    it('should return "just now" for future dates', () => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + 5 * 60 * 1000);
        expect(formatRelativeTime(futureDate)).toBe('just now');
    });
    it('should return "unknown" for null input', () => {
        expect(formatRelativeTime(null)).toBe('unknown');
    });
    it('should return "unknown" for undefined input', () => {
        expect(formatRelativeTime(undefined)).toBe('unknown');
    });
    it('should return "unknown" for empty string', () => {
        expect(formatRelativeTime('')).toBe('unknown');
    });
    it('should return "invalid date" for invalid date string', () => {
        expect(formatRelativeTime('not a date')).toBe('invalid date');
    });
    it('should return "invalid date" for malformed ISO string', () => {
        expect(formatRelativeTime('2024-13-45')).toBe('invalid date');
    });
});
//# sourceMappingURL=time.test.js.map