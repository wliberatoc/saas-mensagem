import { beforeEach, describe, expect, it, vi } from 'vitest';

type SnapshotDocument = {
    id: string;
    data: () => Record<string, unknown>;
};

type QuerySnapshot = {
    docs: SnapshotDocument[];
};

const firestoreMocks = vi.hoisted(() => {
    class FakeTimestamp {
        readonly milliseconds: number;

        constructor(milliseconds: number) {
            this.milliseconds = milliseconds;
        }

        toMillis() {
            return this.milliseconds;
        }

        toDate() {
            return new Date(this.milliseconds);
        }
    }

    return {
        Timestamp: FakeTimestamp,
        collection: vi.fn(() => ({ type: 'collection' })),
        deleteDoc: vi.fn(),
        doc: vi.fn(() => ({ type: 'document' })),
        getDocs: vi.fn(),
        limit: vi.fn((value: number) => ({ type: 'limit', value })),
        onSnapshot: vi.fn(),
        orderBy: vi.fn((field: string, direction: string) => ({
            type: 'orderBy', field, direction,
        })),
        query: vi.fn((...parts: unknown[]) => parts),
        runTransaction: vi.fn(),
        serverTimestamp: vi.fn(),
        startAfter: vi.fn((cursor: unknown) => ({ type: 'startAfter', cursor })),
        updateDoc: vi.fn(),
        where: vi.fn((field: string, operator: string, value: unknown) => ({
            type: 'where', field, operator, value,
        })),
        writeBatch: vi.fn(),
    };
});

vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('./firebase', () => ({ db: {} }));

import {
    loadMoreMessages,
    MESSAGE_PAGE_SIZE,
    observeMessages,
    type MessageCursor,
    type MessagePage,
} from './messages';
import type { MessageFilter } from '../types/message';

let emitSnapshot: ((snapshot: QuerySnapshot) => void) | undefined;

function makeDocuments(count: number, offset = 0): SnapshotDocument[] {
    return Array.from({ length: count }, (_, index) => {
        const number = offset + index;
        return {
            id: `message-${number}`,
            data: () => ({
                clientId: 'client-1',
                connectionId: 'connection-1',
                content: `Message ${number}`,
                recipient: { contactId: 'contact-1', name: 'Contact', phone: '11999999999' },
                status: 'sent',
                createdAt: new firestoreMocks.Timestamp(1000 - number),
                sentAt: new firestoreMocks.Timestamp(1000 - number),
                scheduledAt: null,
                updatedAt: new firestoreMocks.Timestamp(1000 - number),
            }),
        };
    });
}

beforeEach(() => {
    emitSnapshot = undefined;
    vi.clearAllMocks();
    firestoreMocks.onSnapshot.mockImplementation((...args: unknown[]) => {
        emitSnapshot = args[1] as (snapshot: QuerySnapshot) => void;
        return vi.fn();
    });
});

describe('message queries', () => {
    it.each([
        ['all', 'createdAt', 'desc'],
        ['sent', 'sentAt', 'desc'],
        ['scheduled', 'scheduledAt', 'asc'],
    ] as const)('builds the %s filter on Firestore', (filter, field, direction) => {
        const subscription = observeMessages('client-1', 'connection-1', filter).subscribe();

        expect(firestoreMocks.where).toHaveBeenCalledWith('clientId', '==', 'client-1');
        expect(firestoreMocks.where).toHaveBeenCalledWith('connectionId', '==', 'connection-1');
        expect(firestoreMocks.orderBy).toHaveBeenCalledWith(field, direction);
        expect(firestoreMocks.limit).toHaveBeenCalledWith(MESSAGE_PAGE_SIZE);

        if (filter === 'all') {
            expect(firestoreMocks.where).not.toHaveBeenCalledWith('status', '==', expect.anything());
        } else {
            expect(firestoreMocks.where).toHaveBeenCalledWith('status', '==', filter);
        }

        subscription.unsubscribe();
    });
});

describe('message pages', () => {
    it.each([
        [0, false],
        [49, false],
        [50, true],
    ])('maps a first page with %i documents', (count, hasMore) => {
        let received: MessagePage | undefined;
        const subscription = observeMessages('client-1', 'connection-1', 'all')
            .subscribe((page) => { received = page; });

        emitSnapshot?.({ docs: makeDocuments(count) });

        expect(received?.items).toHaveLength(count);
        expect(received?.hasMore).toBe(hasMore);
        expect(received?.cursor?.id ?? null).toBe(count === 0 ? null : `message-${count - 1}`);

        subscription.unsubscribe();
    });

    it('loads the 51st document with startAfter and preserves the cursor', async () => {
        let firstPage: MessagePage | undefined;
        const subscription = observeMessages('client-1', 'connection-1', 'all')
            .subscribe((page) => { firstPage = page; });
        emitSnapshot?.({ docs: makeDocuments(50) });
        const cursor = firstPage?.cursor as MessageCursor;
        firestoreMocks.getDocs.mockResolvedValueOnce({ docs: makeDocuments(1, 50) });

        const nextPage = await loadMoreMessages('client-1', 'connection-1', 'all', cursor);

        expect(firestoreMocks.startAfter).toHaveBeenCalledWith(cursor);
        expect(nextPage.items.map(({ id }) => id)).toEqual(['message-50']);
        expect(nextPage.hasMore).toBe(false);
        expect(nextPage.cursor?.id).toBe('message-50');

        subscription.unsubscribe();
    });

    it('supports more than one historical page without changing the filter', async () => {
        const filter: MessageFilter = 'sent';
        const firstCursor = makeDocuments(1, 49)[0] as MessageCursor;
        const secondDocuments = makeDocuments(50, 50);
        const thirdDocuments = makeDocuments(20, 100);
        firestoreMocks.getDocs
            .mockResolvedValueOnce({ docs: secondDocuments })
            .mockResolvedValueOnce({ docs: thirdDocuments });

        const secondPage = await loadMoreMessages(
            'client-1',
            'connection-1',
            filter,
            firstCursor,
        );
        const thirdPage = await loadMoreMessages(
            'client-1',
            'connection-1',
            filter,
            secondPage.cursor as MessageCursor,
        );

        expect(secondPage.items).toHaveLength(50);
        expect(secondPage.hasMore).toBe(true);
        expect(thirdPage.items).toHaveLength(20);
        expect(thirdPage.hasMore).toBe(false);
        expect(firestoreMocks.where).toHaveBeenCalledWith('status', '==', 'sent');
    });
});
