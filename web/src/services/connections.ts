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
} from 'firebase/firestore';
import { distinctUntilChanged, map, type Observable } from 'rxjs';

import type { Connection, ConnectionInput } from '../types/connection';
import { db } from './firebase';
import { fromFirestoreSubscription, shareLatest } from './firestore-observable';

const connectionsByClient = new Map<string, Observable<Connection[]>>();

export function observeConnections(clientId: string): Observable<Connection[]> {
    const cached = connectionsByClient.get(clientId);
    if (cached) return cached;

    const connectionsQuery = query(
        collection(db, 'connections'),
        where('clientId', '==', clientId),
    );
    const connections = fromFirestoreSubscription<Connection[]>((onNext, onError) => (
        onSnapshot(
            connectionsQuery,
            (snapshot) => {
                const updatedConnections = snapshot.docs
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

                onNext(updatedConnections);
            },
            onError,
        )
    )).pipe(shareLatest());

    connectionsByClient.set(clientId, connections);
    return connections;
}

export function observeConnection(
    clientId: string,
    connectionId: string,
): Observable<Connection | null> {
    return observeConnections(clientId).pipe(
        map((connections) => (
            connections.find((connection) => connection.id === connectionId) ?? null
        )),
        distinctUntilChanged(),
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
