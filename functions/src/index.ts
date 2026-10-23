import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const db = getFirestore();
const SCHEDULED_MESSAGES_PAGE_SIZE = 500;

// This function remains unpublished while the project uses browser scheduling.
export const sendScheduledMessages = onSchedule(
    {
        schedule: 'every 1 minutes',
        timeZone: 'America/Sao_Paulo',
        region: 'southamerica-east1',
    },
    async () => {
        const dueAt = Timestamp.now();
        let found = 0;
        let processed = 0;
        let failed = 0;

        while (true) {
            const scheduledMessages = await db
                .collection('messages')
                .where('status', '==', 'scheduled')
                .where('scheduledAt', '<=', dueAt)
                .orderBy('scheduledAt', 'asc')
                .limit(SCHEDULED_MESSAGES_PAGE_SIZE)
                .get();

            if (scheduledMessages.empty) break;

            found += scheduledMessages.size;
            const sentAt = Timestamp.now();
            const batch = db.batch();

            scheduledMessages.docs.forEach((messageDocument) => {
                batch.update(messageDocument.ref, {
                    status: 'sent',
                    sentAt,
                    updatedAt: sentAt,
                });
            });

            try {
                await batch.commit();
                processed += scheduledMessages.size;
            } catch (error) {
                failed += scheduledMessages.size;
                logger.error('Failed to process a scheduled messages page.', {
                    error,
                    failed,
                    found,
                    processed,
                });
                throw error;
            }
        }

        logger.info('Finished processing scheduled messages.', {
            failed,
            found,
            processed,
        });
    },
);
