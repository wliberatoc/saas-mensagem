import {
    collection,
    onSnapshot,
    query,
    Timestamp,
    where,
    type FirestoreError,
    type Unsubscribe,
} from 'firebase/firestore';

import type { Connection } from '../types/connection';
import { db } from './firebase';

export function subscribeToConnections(
    clientId: string,
    onConnectionsChange: (connections: Connection[]) => void,
    onError: (error: FirestoreError) => void,
): Unsubscribe {
    const connectionsQuery = query(
        collection(db, 'connections'),
        where('clientId', '==', clientId),
    );

    return onSnapshot(
        connectionsQuery,
        (snapshot) => {
            const connections = snapshot.docs
                .map((connectionDocument) => {
                    const data = connectionDocument.data();

                    return {
                        id: connectionDocument.id,
                        clientId: data.clientId as string,
                        name: data.name as string,
                        createdAt: data.createdAt instanceof Timestamp
                            ? data.createdAt
                            : null,
                    } satisfies Connection;
                })
                .sort((first, second) => (
                    (second.createdAt?.toMillis() ?? 0)
                    - (first.createdAt?.toMillis() ?? 0)
                ));

            onConnectionsChange(connections);
        },
        onError,
    );
}
