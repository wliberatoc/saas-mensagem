import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const db = getFirestore();

export const sendScheduledMessages = onSchedule(
    {
        schedule: 'every 1 minutes',
        timeZone: 'America/Sao_Paulo',
        region: 'southamerica-east1',
    },
    async () => {
        const sentAt = Timestamp.now();
        const scheduledMessages = await db
            .collection('messages')
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '<=', sentAt)
            .get();

        logger.info('Finished scanning for scheduled messages.', {
            found: scheduledMessages.size,
        });

        if (scheduledMessages.empty) {
            return;
        }

        const updates = scheduledMessages.docs.map((messageDocument) => ({
            reference: messageDocument.ref,
            data: {
                status: 'sent',
                sentAt,
                updatedAt: sentAt,
            },
        }));

        for (let offset = 0; offset < updates.length; offset += 500) {
            const batch = db.batch();

            updates.slice(offset, offset + 500).forEach(({ reference, data }) => {
                batch.update(reference, data);
            });

            await batch.commit();
        }

        logger.info('Scheduled messages marked as sent.', {
            updated: scheduledMessages.size,
        });
    },
);
