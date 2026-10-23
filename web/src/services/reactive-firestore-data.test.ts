import { beforeEach, describe, expect, it, vi } from 'vitest';

type SnapshotDocument = {
    id: string;
    data: () => Record<string, unknown>;
};

type QuerySnapshot = {
    docs: SnapshotDocument[];
};

type SnapshotListener = {
    next: (snapshot: QuerySnapshot) => void;
    teardown: ReturnType<typeof vi.fn>;
};

const firestoreMocks = vi.hoisted(() => {
    class FakeTimestamp {
        private readonly milliseconds: number;

        constructor(milliseconds: number) {
            this.milliseconds = milliseconds;
        }

        toMillis() {
            return this.milliseconds;
        }
    }

    return {
        Timestamp: FakeTimestamp,
        addDoc: vi.fn(),
        collection: vi.fn(() => ({ type: 'collection' })),
        deleteDoc: vi.fn(),
        doc: vi.fn(() => ({ type: 'document' })),
        getDocs: vi.fn(),
        onSnapshot: vi.fn(),
        query: vi.fn((...parts: unknown[]) => parts),
        serverTimestamp: vi.fn(),
        updateDoc: vi.fn(),
        where: vi.fn((...parts: unknown[]) => parts),
        writeBatch: vi.fn(),
    };
});

vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('./firebase', () => ({ db: {} }));

import { observeConnection, observeConnections } from './connections';
import { observeContacts } from './contacts';

const listeners: SnapshotListener[] = [];

function snapshot(documents: Array<{ id: string; data: Record<string, unknown> }>): QuerySnapshot {
    return {
        docs: documents.map(({ id, data }) => ({ id, data: () => data })),
    };
}

beforeEach(() => {
    listeners.length = 0;
    firestoreMocks.onSnapshot.mockReset();
    firestoreMocks.onSnapshot.mockImplementation((...args: unknown[]) => {
        const next = args[1] as (value: QuerySnapshot) => void;
        const teardown = vi.fn();
        listeners.push({ next, teardown });
        return teardown;
    });
});

describe('observeConnections', () => {
    it('shares one Firestore listener and closes it after the last consumer', () => {
        const source = observeConnections('shared-connections-client');
        const firstValues: string[][] = [];
        const secondValues: string[][] = [];
        const first = source.subscribe((connections) => {
            firstValues.push(connections.map(({ id }) => id));
        });
        const second = source.subscribe((connections) => {
            secondValues.push(connections.map(({ id }) => id));
        });

        expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(1);
        listeners[0].next(snapshot([
            {
                id: 'older',
                data: {
                    clientId: 'shared-connections-client',
                    name: 'Older',
                    createdAt: new firestoreMocks.Timestamp(1),
                },
            },
            {
                id: 'newer',
                data: {
                    clientId: 'shared-connections-client',
                    name: 'Newer',
                    createdAt: new firestoreMocks.Timestamp(2),
                },
            },
        ]));

        expect(firstValues).toEqual([['newer', 'older']]);
        expect(secondValues).toEqual([['newer', 'older']]);

        first.unsubscribe();
        expect(listeners[0].teardown).not.toHaveBeenCalled();

        second.unsubscribe();
        expect(listeners[0].teardown).toHaveBeenCalledTimes(1);
    });

    it('derives the current connection from the shared list', () => {
        const connections = observeConnections('derived-connection-client');
        const currentConnection = observeConnection('derived-connection-client', 'target');
        const currentNames: Array<string | null> = [];
        const listSubscription = connections.subscribe();
        const currentSubscription = currentConnection.subscribe((connection) => {
            currentNames.push(connection?.name ?? null);
        });

        expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(1);

        listeners[0].next(snapshot([
            {
                id: 'target',
                data: { clientId: 'derived-connection-client', name: 'Original' },
            },
        ]));
        listeners[0].next(snapshot([
            {
                id: 'target',
                data: { clientId: 'derived-connection-client', name: 'Updated' },
            },
        ]));
        listeners[0].next(snapshot([]));

        expect(currentNames).toEqual(['Original', 'Updated', null]);

        currentSubscription.unsubscribe();
        listSubscription.unsubscribe();
    });
});

describe('observeContacts', () => {
    it('reuses one sorted stream for the same client and connection', () => {
        const firstSource = observeContacts('contacts-client', 'connection-1');
        const secondSource = observeContacts('contacts-client', 'connection-1');
        const receivedNames: string[][] = [];
        const first = firstSource.subscribe((contacts) => {
            receivedNames.push(contacts.map(({ name }) => name));
        });
        const second = secondSource.subscribe();

        expect(firstSource).toBe(secondSource);
        expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(1);

        listeners[0].next(snapshot([
            {
                id: '2',
                data: {
                    clientId: 'contacts-client',
                    connectionId: 'connection-1',
                    name: 'Zeca',
                    phone: '11999999999',
                },
            },
            {
                id: '1',
                data: {
                    clientId: 'contacts-client',
                    connectionId: 'connection-1',
                    name: 'Ana',
                    phone: '11888888888',
                },
            },
        ]));

        expect(receivedNames).toEqual([['Ana', 'Zeca']]);

        first.unsubscribe();
        second.unsubscribe();
        expect(listeners[0].teardown).toHaveBeenCalledTimes(1);
    });

    it('uses independent listeners for different users and tears the old one down', () => {
        const first = observeContacts('first-user', 'connection').subscribe();
        const second = observeContacts('second-user', 'connection').subscribe();

        expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(2);

        first.unsubscribe();
        expect(listeners[0].teardown).toHaveBeenCalledTimes(1);
        expect(listeners[1].teardown).not.toHaveBeenCalled();

        second.unsubscribe();
        expect(listeners[1].teardown).toHaveBeenCalledTimes(1);
    });

    it('does not trigger message writes when later contact snapshots arrive', () => {
        const subscription = observeContacts('snapshot-client', 'connection').subscribe();

        listeners[0].next(snapshot([{
            id: 'contact-1',
            data: {
                clientId: 'snapshot-client',
                connectionId: 'connection',
                name: 'Primeiro nome',
                phone: '11999999999',
            },
        }]));
        listeners[0].next(snapshot([{
            id: 'contact-1',
            data: {
                clientId: 'snapshot-client',
                connectionId: 'connection',
                name: 'Nome recebido depois',
                phone: '11999999999',
            },
        }]));

        expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
        expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
        expect(firestoreMocks.writeBatch).not.toHaveBeenCalled();
        subscription.unsubscribe();
    });
});
