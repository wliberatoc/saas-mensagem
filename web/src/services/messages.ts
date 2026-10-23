import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    startAfter,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
    type DocumentData,
    type QueryConstraint,
    type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Observable } from 'rxjs';

import type { Message, MessageFilter, MessageInput } from '../types/message';
import { db } from './firebase';
import { fromFirestoreSubscription, shareLatest } from './firestore-observable';

export const MESSAGE_PAGE_SIZE = 50;

export type MessageCursor = QueryDocumentSnapshot<DocumentData>;

export type MessagePage = {
    items: Message[];
    cursor: MessageCursor | null;
    hasMore: boolean;
};

const nextScheduledMessageByClient = new Map<string, Observable<Message | null>>();

function mapMessageDocument(messageDocument: QueryDocumentSnapshot<DocumentData>): Message {
    const data = messageDocument.data();

    return {
        id: messageDocument.id,
        clientId: data.clientId as string,
        connectionId: data.connectionId as string,
        content: data.content as string,
        recipient: data.recipient as Message['recipient'],
        status: data.status as Message['status'],
        scheduledAt: data.scheduledAt instanceof Timestamp ? data.scheduledAt : null,
        sentAt: data.sentAt instanceof Timestamp ? data.sentAt : null,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
    };
}

function toMessagePage(documents: QueryDocumentSnapshot<DocumentData>[]): MessagePage {
    return {
        items: documents.map(mapMessageDocument),
        cursor: documents.at(-1) ?? null,
        hasMore: documents.length === MESSAGE_PAGE_SIZE,
    };
}

function createMessagesQuery(
    clientId: string,
    connectionId: string,
    filter: MessageFilter,
    cursor?: MessageCursor,
) {
    const constraints: QueryConstraint[] = [
        where('clientId', '==', clientId),
        where('connectionId', '==', connectionId),
    ];

    if (filter === 'sent') {
        constraints.push(where('status', '==', 'sent'), orderBy('sentAt', 'desc'));
    } else if (filter === 'scheduled') {
        constraints.push(where('status', '==', 'scheduled'), orderBy('scheduledAt', 'asc'));
    } else {
        constraints.push(orderBy('createdAt', 'desc'));
    }

    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(MESSAGE_PAGE_SIZE));

    return query(
        collection(db, 'messages'),
        ...constraints,
    );
}

export function observeMessages(
    clientId: string,
    connectionId: string,
    filter: MessageFilter,
): Observable<MessagePage> {
    const messagesQuery = createMessagesQuery(clientId, connectionId, filter);

    return fromFirestoreSubscription<MessagePage>((onNext, onError) => (
        onSnapshot(
            messagesQuery,
            (snapshot) => onNext(toMessagePage(snapshot.docs)),
            onError,
        )
    ));
}

export async function loadMoreMessages(
    clientId: string,
    connectionId: string,
    filter: MessageFilter,
    cursor: MessageCursor,
): Promise<MessagePage> {
    const snapshot = await getDocs(createMessagesQuery(clientId, connectionId, filter, cursor));
    return toMessagePage(snapshot.docs);
}

export function observeNextScheduledMessage(clientId: string): Observable<Message | null> {
    const cached = nextScheduledMessageByClient.get(clientId);
    if (cached) return cached;

    const nextScheduledMessageQuery = query(
        collection(db, 'messages'),
        where('clientId', '==', clientId),
        where('status', '==', 'scheduled'),
        orderBy('scheduledAt', 'asc'),
        limit(1),
    );
    const nextScheduledMessage = fromFirestoreSubscription<Message | null>((onNext, onError) => (
        onSnapshot(
            nextScheduledMessageQuery,
            (snapshot) => onNext(
                snapshot.docs[0] ? mapMessageDocument(snapshot.docs[0]) : null,
            ),
            onError,
        )
    )).pipe(shareLatest());

    nextScheduledMessageByClient.set(clientId, nextScheduledMessage);
    return nextScheduledMessage;
}

export async function createMessages(clientId: string, connectionId: string, messages: MessageInput[]) {
    for (let offset = 0; offset < messages.length; offset += 500) {
        const batch = writeBatch(db);

        messages.slice(offset, offset + 500).forEach((message) => {
            const isScheduled = message.scheduledAt !== null;
            const messageReference = doc(collection(db, 'messages'));

            batch.set(messageReference, {
                clientId,
                connectionId,
                content: message.content,
                recipient: message.recipient,
                status: isScheduled ? 'scheduled' : 'sent',
                scheduledAt: isScheduled ? Timestamp.fromDate(message.scheduledAt as Date) : null,
                sentAt: isScheduled ? null : serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();
    }
}

export function updateScheduledMessage(messageId: string, message: MessageInput) {
    if (!message.scheduledAt) {
        throw new Error('A mensagem agendada precisa de uma data de envio.');
    }

    return updateDoc(doc(db, 'messages', messageId), {
        content: message.content,
        recipient: message.recipient,
        scheduledAt: Timestamp.fromDate(message.scheduledAt),
        updatedAt: serverTimestamp(),
    });
}

export function deleteMessage(messageId: string) {
    return deleteDoc(doc(db, 'messages', messageId));
}

export function processScheduledMessage(clientId: string, messageId: string): Promise<boolean> {
    return runTransaction(db, async (transaction) => {
        const messageReference = doc(db, 'messages', messageId);
        const currentMessage = await transaction.get(messageReference);

        if (!currentMessage.exists()) {
            return false;
        }

        const data = currentMessage.data();
        if (
            data.clientId !== clientId
            || data.status !== 'scheduled'
            || !(data.scheduledAt instanceof Timestamp)
            || data.scheduledAt.toMillis() > Date.now()
        ) {
            return false;
        }

        transaction.update(messageReference, {
            status: 'sent',
            sentAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return true;
    });
}
