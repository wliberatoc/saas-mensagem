import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
    type FirestoreError,
    type Unsubscribe,
} from 'firebase/firestore';

import type { Connection, ConnectionInput } from '../types/connection';
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
                        updatedAt: data.updatedAt instanceof Timestamp
                            ? data.updatedAt
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

export function subscribeToConnection(
    connectionId: string,
    clientId: string,
    onConnectionChange: (connection: Connection | null) => void,
    onError: (error: FirestoreError) => void,
): Unsubscribe {
    return onSnapshot(
        doc(db, 'connections', connectionId),
        (snapshot) => {
            if (!snapshot.exists()) {
                onConnectionChange(null);
                return;
            }

            const data = snapshot.data();

            if (data.clientId !== clientId) {
                onConnectionChange(null);
                return;
            }

            onConnectionChange({
                id: snapshot.id,
                clientId: data.clientId as string,
                name: data.name as string,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
            });
        },
        onError,
    );
}

export function createConnection(clientId: string, connection: ConnectionInput) {
    return addDoc(collection(db, 'connections'), {
        clientId,
        name: connection.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export function updateConnection(connectionId: string, connection: ConnectionInput) {
    return updateDoc(doc(db, 'connections', connectionId), {
        name: connection.name,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteConnection(clientId: string, connectionId: string) {
    const dependencyQueries = ['contacts', 'messages'].map((collectionName) => (
        getDocs(query(
            collection(db, collectionName),
            where('clientId', '==', clientId),
            where('connectionId', '==', connectionId),
        ))
    ));
    const dependencySnapshots = await Promise.all(dependencyQueries);
    const dependencyDocuments = dependencySnapshots.flatMap((snapshot) => snapshot.docs);

    for (let offset = 0; offset < dependencyDocuments.length; offset += 500) {
        const batch = writeBatch(db);

        dependencyDocuments.slice(offset, offset + 500).forEach((document) => {
            batch.delete(document.ref);
        });

        await batch.commit();
    }

    await deleteDoc(doc(db, 'connections', connectionId));
}
