import { useEffect } from 'react';

import {
    observeNextScheduledMessage,
    processScheduledMessage,
} from '../services/messages';
import { createScheduledMessagesProcessor } from '../services/scheduled-messages';

type ScheduledMessagesProcessorProps = {
    clientId: string;
};

export function ScheduledMessagesProcessor({ clientId }: ScheduledMessagesProcessorProps) {
    useEffect(() => {
        const subscription = createScheduledMessagesProcessor(
            observeNextScheduledMessage(clientId),
            (message) => processScheduledMessage(clientId, message.id),
            {
                onError: (error) => {
                    console.error('Não foi possível processar a mensagem agendada.', error);
                },
            },
        ).subscribe((processed) => {
            if (processed) console.info('Mensagem agendada processada.');
        });

        return () => subscription.unsubscribe();
    }, [clientId]);

    return null;
}
