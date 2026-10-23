import { describe, expect, it } from 'vitest';

import { resolveSchedulerMode, shouldRunBrowserScheduler } from './scheduler';

describe('scheduler mode', () => {
    it('uses browser mode when the variable is missing', () => {
        expect(resolveSchedulerMode(undefined)).toBe('browser');
        expect(shouldRunBrowserScheduler(resolveSchedulerMode(undefined))).toBe(true);
    });

    it('keeps the reactive browser processor enabled explicitly', () => {
        expect(resolveSchedulerMode('browser')).toBe('browser');
        expect(shouldRunBrowserScheduler('browser')).toBe(true);
    });

    it('disables the browser processor in cloud mode', () => {
        expect(resolveSchedulerMode('cloud')).toBe('cloud');
        expect(shouldRunBrowserScheduler('cloud')).toBe(false);
    });

    it('falls back safely to browser mode for an invalid value', () => {
        expect(resolveSchedulerMode('invalid')).toBe('browser');
    });
});
