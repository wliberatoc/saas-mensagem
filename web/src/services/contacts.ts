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
import type { Observable } from 'rxjs';

import type { Contact, ContactInput, ContactUpdateInput } from '../types/contact';
import { db } from './firebase';
import { fromFirestoreSubscription, shareLatest } from './firestore-observable';

const contactsByConnection = new Map<string, Observable<Contact[]>>();

export function observeContacts(clientId: string, connectionId: string): Observable<Contact[]> {
    const cacheKey = JSON.stringify([clientId, connectionId]);
    const cached = contactsByConnection.get(cacheKey);
    if (cached) return cached;

    const contactsQuery = query(
        collection(db, 'contacts'),
        where('clientId', '==', clientId),
        where('connectionId', '==', connectionId),
    );
    const contacts = fromFirestoreSubscription<Contact[]>((onNext, onError) => (
        onSnapshot(
            contactsQuery,
            (snapshot) => {
                const updatedContacts = snapshot.docs
                    .map((contactDocument) => {
                        const data = contactDocument.data();

                        return {
                            id: contactDocument.id,
                            clientId: data.clientId as string,
                            connectionId: data.connectionId as string,
                            name: data.name as string,
                            phone: data.phone as string,
                            createdAt: data.createdAt instanceof Timestamp
                                ? data.createdAt
                                : null,
                            updatedAt: data.updatedAt instanceof Timestamp
                                ? data.updatedAt
                                : null,
                        } satisfies Contact;
                    })
                    .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));

                onNext(updatedContacts);
            },
            onError,
        )
    )).pipe(shareLatest());

    contactsByConnection.set(cacheKey, contacts);
    return contacts;
}

export function createContact(clientId: string, contact: ContactInput) {
    return addDoc(collection(db, 'contacts'), {
        clientId,
        connectionId: contact.connectionId,
        name: contact.name,
        phone: contact.phone,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function updateContact(
    clientId: string,
    currentContact: Pick<Contact, 'id' | 'name'>,
    contact: ContactUpdateInput,
) {
    await updateDoc(doc(db, 'contacts', currentContact.id), {
        name: contact.name,
        phone: contact.phone,
        updatedAt: serverTimestamp(),
    });

    if (currentContact.name === contact.name) return;

    const messagesSnapshot = await getDocs(query(
        collection(db, 'messages'),
        where('clientId', '==', clientId),
        where('recipient.contactId', '==', currentContact.id),
    ));

    for (let offset = 0; offset < messagesSnapshot.docs.length; offset += 500) {
        const batch = writeBatch(db);
        let hasUpdates = false;

        messagesSnapshot.docs.slice(offset, offset + 500).forEach((messageDocument) => {
            const recipient = messageDocument.data().recipient as { contactId: string; name?: string; phone: string };

            if (recipient.name !== contact.name) {
                hasUpdates = true;
                batch.update(messageDocument.ref, {
                    'recipient.name': contact.name,
                    updatedAt: serverTimestamp(),
                });
            }
        });

        if (hasUpdates) await batch.commit();
    }
}

export function deleteContact(contactId: string) {
    return deleteDoc(doc(db, 'contacts', contactId));
}
