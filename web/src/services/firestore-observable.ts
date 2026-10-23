import {
    Observable,
    shareReplay,
    type MonoTypeOperatorFunction,
} from 'rxjs';

type NextHandler<T> = (value: T) => void;
type ErrorHandler = (error: unknown) => void;
type Unsubscribe = () => void;

export type FirestoreSubscription<T> = (
    onNext: NextHandler<T>,
    onError: ErrorHandler,
) => Unsubscribe;

/**
 * Adapts Firebase's callback subscription shape to an RxJS Observable.
 * The Firebase listener exists only while the Observable is subscribed.
 */
export function fromFirestoreSubscription<T>(
    subscribe: FirestoreSubscription<T>,
): Observable<T> {
    return new Observable<T>((subscriber) => {
        let unsubscribe: Unsubscribe | undefined;

        try {
            unsubscribe = subscribe(
                (value) => subscriber.next(value),
                (error) => subscriber.error(error),
            );
        } catch (error) {
            subscriber.error(error);
        }

        return () => unsubscribe?.();
    });
}

/** Shares one active Firestore listener and replays its latest value. */
export function shareLatest<T>(): MonoTypeOperatorFunction<T> {
    return shareReplay({ bufferSize: 1, refCount: true });
}
