import { beforeEach, describe, expect, it, vi } from 'vitest';

type MessageDocument = {
    ref: { id: string };
    data: () => {
        recipient: {
            contactId: string;
            name?: string;
            phone: string;
        };
    };
};

const firestoreMocks = vi.hoisted(() => ({
    Timestamp: class FakeTimestamp {},
    addDoc: vi.fn(),
    collection: vi.fn((_database: unknown, name: string) => ({ name })),
    deleteDoc: vi.fn(),
    doc: vi.fn((_database: unknown, collectionName: string, id: string) => ({
        collectionName,
        id,
    })),
    getDocs: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn((...parts: unknown[]) => parts),
    serverTimestamp: vi.fn(() => ({ serverTimestamp: true })),
    updateDoc: vi.fn(),
    where: vi.fn((field: string, operator: string, value: unknown) => ({
        field,
        operator,
        value,
    })),
    writeBatch: vi.fn(),
}));

vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('./firebase', () => ({ db: {} }));

import { deleteContact, updateContact } from './contacts';

function makeMessageDocument(index: number, recipientName = 'Nome anterior'): MessageDocument {
    return {
        ref: { id: `message-${index}` },
        data: () => ({
            recipient: {
                contactId: 'contact-1',
                name: recipientName,
                phone: '11999999999',
            },
        }),
    };
}

beforeEach(() => {
    firestoreMocks.getDocs.mockResolvedValue({ docs: [] });
    firestoreMocks.writeBatch.mockImplementation(() => ({
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
    }));
});

describe('updateContact', () => {
    it('does not query messages when only the phone changes', async () => {
        await updateContact(
            'client-1',
            { id: 'contact-1', name: 'Mesmo nome' },
            { name: 'Mesmo nome', phone: '11888888888' },
        );

        expect(firestoreMocks.updateDoc).toHaveBeenCalledOnce();
        expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
        expect(firestoreMocks.writeBatch).not.toHaveBeenCalled();
    });

    it('queries once and updates each stale recipient once when the name changes', async () => {
        const firstMessage = makeMessageDocument(1);
        const alreadyUpdatedMessage = makeMessageDocument(2, 'Nome novo');
        const update = vi.fn();
        const commit = vi.fn().mockResolvedValue(undefined);
        firestoreMocks.getDocs.mockResolvedValueOnce({
            docs: [firstMessage, alreadyUpdatedMessage],
        });
        firestoreMocks.writeBatch.mockReturnValueOnce({ update, commit });

        await updateContact(
            'client-1',
            { id: 'contact-1', name: 'Nome anterior' },
            { name: 'Nome novo', phone: '11999999999' },
        );

        expect(firestoreMocks.getDocs).toHaveBeenCalledOnce();
        expect(firestoreMocks.where).toHaveBeenCalledWith('clientId', '==', 'client-1');
        expect(firestoreMocks.where).toHaveBeenCalledWith(
            'recipient.contactId',
            '==',
            'contact-1',
        );
        expect(update).toHaveBeenCalledOnce();
        expect(update).toHaveBeenCalledWith(firstMessage.ref, {
            'recipient.name': 'Nome novo',
            updatedAt: { serverTimestamp: true },
        });
        expect(commit).toHaveBeenCalledOnce();
    });

    it('splits more than 500 affected messages into valid batches', async () => {
        const documents = Array.from(
            { length: 501 },
            (_, index) => makeMessageDocument(index),
        );
        const batches = Array.from({ length: 2 }, () => ({
            update: vi.fn(),
            commit: vi.fn().mockResolvedValue(undefined),
        }));
        firestoreMocks.getDocs.mockResolvedValueOnce({ docs: documents });
        firestoreMocks.writeBatch
            .mockReturnValueOnce(batches[0])
            .mockReturnValueOnce(batches[1]);

        await updateContact(
            'client-1',
            { id: 'contact-1', name: 'Nome anterior' },
            { name: 'Nome novo', phone: '11999999999' },
        );

        expect(batches[0].update).toHaveBeenCalledTimes(500);
        expect(batches[1].update).toHaveBeenCalledOnce();
        expect(batches[0].commit).toHaveBeenCalledOnce();
        expect(batches[1].commit).toHaveBeenCalledOnce();
    });
});

describe('deleteContact', () => {
    it('deletes only the contact and preserves message recipient history', async () => {
        await deleteContact('contact-1');

        expect(firestoreMocks.deleteDoc).toHaveBeenCalledOnce();
        expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
        expect(firestoreMocks.writeBatch).not.toHaveBeenCalled();
    });
});
