import { useEffect } from 'react';

import { processDueMessages } from '../services/messages';

type ScheduledMessagesProcessorProps = {
    clientId: string;
};

const processingByClient = new Map<string, Promise<void>>();

function requestProcessing(clientId: string) {
    const currentProcessing = processingByClient.get(clientId);
    if (currentProcessing) return currentProcessing;

    const processing = processDueMessages(clientId)
        .then(({ failed, found, processed }) => {
            if (processed > 0) {
                console.info('Mensagens agendadas processadas.', { found, processed });
            }
            if (failed > 0) {
                console.error('Algumas mensagens agendadas não puderam ser processadas.', { failed, found });
            }
        })
        .catch((error: unknown) => {
            console.error('Não foi possível processar as mensagens agendadas.', error);
        })
        .finally(() => {
            processingByClient.delete(clientId);
        });

    processingByClient.set(clientId, processing);
    return processing;
}

export function ScheduledMessagesProcessor({ clientId }: ScheduledMessagesProcessorProps) {
    useEffect(() => {
        void requestProcessing(clientId);

        const intervalId = window.setInterval(() => {
            void requestProcessing(clientId);
        }, 60_000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void requestProcessing(clientId);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [clientId]);

    return null;
}
