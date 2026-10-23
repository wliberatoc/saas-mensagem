import {
    catchError,
    defer,
    distinctUntilChanged,
    EMPTY,
    exhaustMap,
    from,
    map,
    type Observable,
    switchMap,
    timer,
} from 'rxjs';

import type { Message } from '../types/message';

type ScheduledMessageProcessorOptions = {
    now?: () => number;
    onError?: (error: unknown) => void;
};

function isSameSchedule(first: Message | null, second: Message | null) {
    return first?.id === second?.id
        && first?.scheduledAt?.toMillis() === second?.scheduledAt?.toMillis();
}

export function createScheduledMessagesProcessor(
    nextMessage: Observable<Message | null>,
    processMessage: (message: Message) => Promise<boolean>,
    { now = Date.now, onError = console.error }: ScheduledMessageProcessorOptions = {},
): Observable<boolean> {
    return nextMessage.pipe(
        distinctUntilChanged(isSameSchedule),
        switchMap((message) => {
            if (!message?.scheduledAt) return EMPTY;

            const delay = Math.max(0, message.scheduledAt.toMillis() - now());
            return timer(delay).pipe(map(() => message));
        }),
        exhaustMap((message) => defer(() => from(processMessage(message))).pipe(
            catchError((error: unknown) => {
                onError(error);
                return EMPTY;
            }),
        )),
    );
}
