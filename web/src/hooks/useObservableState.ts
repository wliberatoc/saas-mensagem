import { useEffect, useState } from 'react';
import type { Observable } from 'rxjs';

export type AsyncState<T> =
    | { status: 'loading'; data: T; error: null }
    | { status: 'ready'; data: T; error: null }
    | { status: 'error'; data: T; error: unknown };

type ObservableState<T> = {
    source: Observable<T>;
    initialData: T;
    result: AsyncState<T>;
};

export function useObservableState<T>(
    source: Observable<T>,
    initialData: T,
): AsyncState<T> {
    const [state, setState] = useState<ObservableState<T>>({
        source,
        initialData,
        result: { status: 'loading', data: initialData, error: null },
    });

    if (state.source !== source || !Object.is(state.initialData, initialData)) {
        setState({
            source,
            initialData,
            result: { status: 'loading', data: initialData, error: null },
        });
    }

    useEffect(() => {
        const subscription = source.subscribe({
            next: (data) => {
                setState((current) => current.source === source
                    ? { ...current, result: { status: 'ready', data, error: null } }
                    : current);
            },
            error: (error: unknown) => {
                setState((current) => current.source === source
                    ? {
                        ...current,
                        result: { ...current.result, status: 'error', error },
                    }
                    : current);
            },
        });

        return () => subscription.unsubscribe();
    }, [source]);

    return state.source === source
        ? state.result
        : { status: 'loading', data: initialData, error: null };
}
