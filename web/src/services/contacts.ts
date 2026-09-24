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

import type { Contact, ContactInput, ContactUpdateInput } from '../types/contact';
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

export async function updateContact(clientId: string, contactId: string, contact: ContactUpdateInput) {
    await updateDoc(doc(db, 'contacts', contactId), {
        name: contact.name,
        phone: contact.phone,
        updatedAt: serverTimestamp(),
    });

    const messagesSnapshot = await getDocs(query(
        collection(db, 'messages'),
        where('clientId', '==', clientId),
        where('recipient.contactId', '==', contactId),
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
