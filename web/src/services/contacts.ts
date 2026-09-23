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

import type { Contact, ContactInput } from '../types/contact';
import { db } from './firebase';

export function subscribeToContacts(
    clientId: string,
    connectionId: string,
    onContactsChange: (contacts: Contact[]) => void,
    onError: (error: FirestoreError) => void,
): Unsubscribe {
    const contactsQuery = query(
        collection(db, 'contacts'),
        where('clientId', '==', clientId),
        where('connectionId', '==', connectionId),
    );

    return onSnapshot(
        contactsQuery,
        (snapshot) => {
            const contacts = snapshot.docs
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

            onContactsChange(contacts);
        },
        onError,
    );
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

export function updateContact(contactId: string, contact: ContactInput) {
    return updateDoc(doc(db, 'contacts', contactId), {
        connectionId: contact.connectionId,
        name: contact.name,
        phone: contact.phone,
        updatedAt: serverTimestamp(),
    });
}

export function deleteContact(contactId: string) {
    return deleteDoc(doc(db, 'contacts', contactId));
}
