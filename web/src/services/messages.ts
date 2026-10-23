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
import type { Contact } from '../types/contact';
import { db } from './firebase';
import { fromFirestoreSubscription } from './firestore-observable';

export const MESSAGE_PAGE_SIZE = 50;

export type MessageCursor = QueryDocumentSnapshot<DocumentData>;

export type MessagePage = {
    items: Message[];
    cursor: MessageCursor | null;
    hasMore: boolean;
};

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

export async function synchronizeMessageRecipientNames(messages: Message[], contacts: Contact[]) {
    const contactNames = new Map(contacts.map((contact) => [contact.id, contact.name]));
    const messagesToUpdate = messages.filter((message) => {
        const currentContactName = contactNames.get(message.recipient.contactId);
        return currentContactName !== undefined && currentContactName !== message.recipient.name;
    });

    for (let offset = 0; offset < messagesToUpdate.length; offset += 500) {
        const batch = writeBatch(db);

        messagesToUpdate.slice(offset, offset + 500).forEach((message) => {
            batch.update(doc(db, 'messages', message.id), {
                'recipient.name': contactNames.get(message.recipient.contactId),
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();
    }
}

export type ScheduledMessagesProcessingResult = {
    found: number;
    processed: number;
    failed: number;
};

export async function processDueMessages(clientId: string): Promise<ScheduledMessagesProcessingResult> {
    const now = Timestamp.now();
    const dueMessagesQuery = query(
        collection(db, 'messages'),
        where('clientId', '==', clientId),
        where('status', '==', 'scheduled'),
        where('scheduledAt', '<=', now),
    );
    const dueMessages = await getDocs(dueMessagesQuery);
    let processed = 0;
    let failed = 0;

    for (let offset = 0; offset < dueMessages.docs.length; offset += 10) {
        const results = await Promise.allSettled(
            dueMessages.docs.slice(offset, offset + 10).map((messageDocument) => (
                runTransaction(db, async (transaction) => {
                    const currentMessage = await transaction.get(messageDocument.ref);

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

                    transaction.update(messageDocument.ref, {
                        status: 'sent',
                        sentAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });

                    return true;
                })
            )),
        );

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                if (result.value) processed += 1;
            } else {
                failed += 1;
            }
        });
    }

    return {
        found: dueMessages.size,
        processed,
        failed,
    };
}
