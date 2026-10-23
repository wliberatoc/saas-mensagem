import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Message } from '../types/message';
import { createScheduledMessagesProcessor } from './scheduled-messages';

function makeMessage(id: string, scheduledAt: number): Message {
    return {
        id,
        clientId: 'client-1',
        connectionId: 'connection-1',
        content: 'Mensagem',
        recipient: {
            contactId: 'contact-1',
            name: 'Contato',
            phone: '11999999999',
        },
        status: 'scheduled',
        scheduledAt: {
            toMillis: () => scheduledAt,
        } as Message['scheduledAt'],
        sentAt: null,
        createdAt: null,
        updatedAt: null,
    };
}

describe('reactive scheduled message processor', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(1_000);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('waits until a future message reaches its scheduled time', async () => {
        const nextMessage = new Subject<Message | null>();
        const processMessage = vi.fn().mockResolvedValue(true);
        const subscription = createScheduledMessagesProcessor(nextMessage, processMessage).subscribe();

        nextMessage.next(makeMessage('future', 2_000));
        await vi.advanceTimersByTimeAsync(999);
        expect(processMessage).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(processMessage).toHaveBeenCalledOnce();
        expect(processMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'future' }));
        subscription.unsubscribe();
    });

    it('processes an overdue message immediately', async () => {
        const nextMessage = new Subject<Message | null>();
        const processMessage = vi.fn().mockResolvedValue(true);
        const subscription = createScheduledMessagesProcessor(nextMessage, processMessage).subscribe();

        nextMessage.next(makeMessage('overdue', 500));
        await vi.advanceTimersByTimeAsync(0);

        expect(processMessage).toHaveBeenCalledOnce();
        subscription.unsubscribe();
    });

    it('replaces the previous timer when the schedule changes', async () => {
        const nextMessage = new Subject<Message | null>();
        const processMessage = vi.fn().mockResolvedValue(true);
        const subscription = createScheduledMessagesProcessor(nextMessage, processMessage).subscribe();

        nextMessage.next(makeMessage('edited', 2_000));
        nextMessage.next(makeMessage('edited', 3_000));
        await vi.advanceTimersByTimeAsync(1_000);
        expect(processMessage).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1_000);
        expect(processMessage).toHaveBeenCalledOnce();
        subscription.unsubscribe();
    });

    it('cancels a deleted message and schedules the following one', async () => {
        const nextMessage = new Subject<Message | null>();
        const processMessage = vi.fn().mockResolvedValue(true);
        const subscription = createScheduledMessagesProcessor(nextMessage, processMessage).subscribe();

        nextMessage.next(makeMessage('deleted', 2_000));
        nextMessage.next(null);
        await vi.advanceTimersByTimeAsync(1_000);
        expect(processMessage).not.toHaveBeenCalled();

        nextMessage.next(makeMessage('following', 2_500));
        await vi.advanceTimersByTimeAsync(500);
        expect(processMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'following' }));
        subscription.unsubscribe();
    });

    it('ignores repeated schedule events and concurrent triggers', async () => {
        const nextMessage = new Subject<Message | null>();
        let finishProcessing: ((value: boolean) => void) | undefined;
        const processMessage = vi.fn(() => new Promise<boolean>((resolve) => {
            finishProcessing = resolve;
        }));
        const subscription = createScheduledMessagesProcessor(nextMessage, processMessage).subscribe();
        const message = makeMessage('same', 1_000);

        nextMessage.next(message);
        await vi.advanceTimersByTimeAsync(0);
        nextMessage.next(message);
        nextMessage.next(makeMessage('another', 1_000));
        await vi.advanceTimersByTimeAsync(0);

        expect(processMessage).toHaveBeenCalledOnce();
        finishProcessing?.(true);
        await Promise.resolve();
        subscription.unsubscribe();
    });

    it('cancels the timer on unsubscribe', async () => {
        const nextMessage = new Subject<Message | null>();
        const processMessage = vi.fn().mockResolvedValue(true);
        const subscription = createScheduledMessagesProcessor(nextMessage, processMessage).subscribe();

        nextMessage.next(makeMessage('cancelled', 2_000));
        subscription.unsubscribe();
        await vi.advanceTimersByTimeAsync(1_000);

        expect(processMessage).not.toHaveBeenCalled();
    });

    it('keeps listening after a processing error', async () => {
        const nextMessage = new Subject<Message | null>();
        const onError = vi.fn();
        const processMessage = vi.fn()
            .mockRejectedValueOnce(new Error('failure'))
            .mockResolvedValueOnce(true);
        const subscription = createScheduledMessagesProcessor(
            nextMessage,
            processMessage,
            { onError },
        ).subscribe();

        nextMessage.next(makeMessage('failed', 1_000));
        await vi.advanceTimersByTimeAsync(0);
        nextMessage.next(makeMessage('retry-flow', 1_000));
        await vi.advanceTimersByTimeAsync(0);

        expect(onError).toHaveBeenCalledOnce();
        expect(processMessage).toHaveBeenCalledTimes(2);
        subscription.unsubscribe();
    });
});
