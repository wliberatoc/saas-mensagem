import type { Timestamp } from 'firebase/firestore';

export type Contact = {
    id: string;
    clientId: string;
    name: string;
    phone: string;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
};

export type ContactInput = {
    name: string;
    phone: string;
};
