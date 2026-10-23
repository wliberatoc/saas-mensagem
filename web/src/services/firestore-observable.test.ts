import { describe, expect, it, vi } from 'vitest';

import {
    fromFirestoreSubscription,
    shareLatest,
    type FirestoreSubscription,
} from './firestore-observable';

describe('fromFirestoreSubscription', () => {
    it('forwards values in order and tears the source down once', () => {
        const teardown = vi.fn();
        let emit: ((value: number) => void) | undefined;
        const source = fromFirestoreSubscription<number>((onNext) => {
            emit = onNext;
            return teardown;
        });
        const values: number[] = [];
        const subscription = source.subscribe((value) => values.push(value));

        emit?.(1);
        emit?.(2);
        subscription.unsubscribe();
        subscription.unsubscribe();

        expect(values).toEqual([1, 2]);
        expect(teardown).toHaveBeenCalledTimes(1);
    });

    it('forwards asynchronous and synchronous subscription errors', () => {
        const asyncError = new Error('snapshot failed');
        const syncError = new Error('subscription failed');
        const onAsyncError = vi.fn();
        const onSyncError = vi.fn();
        let fail: ((error: unknown) => void) | undefined;

        fromFirestoreSubscription<number>((_onNext, onError) => {
            fail = onError;
            return vi.fn();
        }).subscribe({ error: onAsyncError });
        fail?.(asyncError);

        fromFirestoreSubscription<number>(() => {
            throw syncError;
        }).subscribe({ error: onSyncError });

        expect(onAsyncError).toHaveBeenCalledWith(asyncError);
        expect(onSyncError).toHaveBeenCalledWith(syncError);
    });
});

describe('shareLatest', () => {
    it('shares one source, replays the latest value, and closes after the last consumer', () => {
        const teardown = vi.fn();
        let sourceSubscriptions = 0;
        let emit: ((value: string) => void) | undefined;
        const subscribe: FirestoreSubscription<string> = (onNext) => {
            sourceSubscriptions += 1;
            emit = onNext;
            return teardown;
        };
        const shared = fromFirestoreSubscription(subscribe).pipe(shareLatest());
        const firstValues: string[] = [];
        const secondValues: string[] = [];
        const first = shared.subscribe((value) => firstValues.push(value));

        emit?.('latest');
        const second = shared.subscribe((value) => secondValues.push(value));

        expect(sourceSubscriptions).toBe(1);
        expect(firstValues).toEqual(['latest']);
        expect(secondValues).toEqual(['latest']);

        first.unsubscribe();
        expect(teardown).not.toHaveBeenCalled();

        second.unsubscribe();
        expect(teardown).toHaveBeenCalledTimes(1);
    });
});
