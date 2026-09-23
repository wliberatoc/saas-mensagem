import type { Timestamp } from 'firebase/firestore';

export type MessageStatus = 'scheduled' | 'sent';

export type MessageRecipient = {
    contactId: string;
    phone: string;
};

export type Message = {
    id: string;
    clientId: string;
    connectionId: string;
    content: string;
    recipient: MessageRecipient;
    status: MessageStatus;
    scheduledAt: Timestamp | null;
    sentAt: Timestamp | null;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
};

export type MessageInput = {
    content: string;
    recipient: MessageRecipient;
    scheduledAt: Date | null;
};
