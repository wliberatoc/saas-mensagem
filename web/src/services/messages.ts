import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
    type FirestoreError,
    type Unsubscribe,
} from 'firebase/firestore';

import type { Message, MessageInput } from '../types/message';
import { db } from './firebase';

export function subscribeToMessages(
    clientId: string,
    connectionId: string,
    onMessagesChange: (messages: Message[]) => void,
    onError: (error: FirestoreError) => void,
): Unsubscribe {
    const messagesQuery = query(
        collection(db, 'messages'),
        where('clientId', '==', clientId),
        where('connectionId', '==', connectionId),
    );

    return onSnapshot(
        messagesQuery,
        (snapshot) => {
            const messages = snapshot.docs.map((messageDocument) => {
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
                } satisfies Message;
            }).sort((first, second) => (
                (second.createdAt?.toMillis() ?? 0) - (first.createdAt?.toMillis() ?? 0)
            ));

            onMessagesChange(messages);
        },
        onError,
    );
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
