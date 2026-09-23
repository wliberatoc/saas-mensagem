import type { Timestamp } from 'firebase/firestore';

export type Contact = {
    id: string;
    clientId: string;
    connectionId: string;
    name: string;
    phone: string;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
};

export type ContactInput = {
    connectionId: string;
    name: string;
    phone: string;
};

export type ContactUpdateInput = {
    name: string;
    phone: string;
};
