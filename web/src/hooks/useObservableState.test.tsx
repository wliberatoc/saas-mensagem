import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Observable, Subject } from 'rxjs';

import { useObservableState } from './useObservableState';

afterEach(cleanup);

describe('useObservableState', () => {
    it('moves from loading to ready and preserves data when an error occurs', () => {
        const source = new Subject<number>();
        const error = new Error('stream failed');
        const { result } = renderHook(() => useObservableState(source, 0));

        expect(result.current).toEqual({ status: 'loading', data: 0, error: null });

        act(() => source.next(42));
        expect(result.current).toEqual({ status: 'ready', data: 42, error: null });

        act(() => source.error(error));
        expect(result.current).toEqual({ status: 'error', data: 42, error });
    });

    it('unsubscribes when unmounted', () => {
        const teardown = vi.fn();
        const source = new Observable<number>(() => teardown);
        const { unmount } = renderHook(() => useObservableState(source, 0));

        unmount();

        expect(teardown).toHaveBeenCalledTimes(1);
    });

    it('resets and replaces the subscription when the source changes', () => {
        const firstTeardown = vi.fn();
        const secondTeardown = vi.fn();
        const first = new Observable<number>((subscriber) => {
            subscriber.next(1);
            return firstTeardown;
        });
        const second = new Observable<number>((subscriber) => {
            subscriber.next(2);
            return secondTeardown;
        });
        const { result, rerender, unmount } = renderHook(
            ({ source }) => useObservableState(source, 0),
            { initialProps: { source: first } },
        );

        expect(result.current).toEqual({ status: 'ready', data: 1, error: null });

        rerender({ source: second });

        expect(firstTeardown).toHaveBeenCalledTimes(1);
        expect(result.current).toEqual({ status: 'ready', data: 2, error: null });

        unmount();
        expect(secondTeardown).toHaveBeenCalledTimes(1);
    });
});
