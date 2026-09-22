import type { Timestamp } from 'firebase/firestore';

export type Connection = {
    id: string;
    clientId: string;
    name: string;
    createdAt: Timestamp | null;
};
