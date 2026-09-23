import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
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
                    recipients: Array.isArray(data.recipients) ? data.recipients : [],
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

export function createMessage(clientId: string, connectionId: string, message: MessageInput) {
    const isScheduled = message.scheduledAt !== null;

    return addDoc(collection(db, 'messages'), {
        clientId,
        connectionId,
        content: message.content,
        recipients: message.recipients,
        status: isScheduled ? 'scheduled' : 'sent',
        scheduledAt: isScheduled ? Timestamp.fromDate(message.scheduledAt as Date) : null,
        sentAt: isScheduled ? null : serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export function updateScheduledMessage(messageId: string, message: MessageInput) {
    if (!message.scheduledAt) {
        throw new Error('A mensagem agendada precisa de uma data de envio.');
    }

    return updateDoc(doc(db, 'messages', messageId), {
        content: message.content,
        recipients: message.recipients,
        scheduledAt: Timestamp.fromDate(message.scheduledAt),
        updatedAt: serverTimestamp(),
    });
}

export function deleteMessage(messageId: string) {
    return deleteDoc(doc(db, 'messages', messageId));
}
