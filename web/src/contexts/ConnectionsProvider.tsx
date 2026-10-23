import { useMemo, type ReactNode } from 'react';

import { useObservableState } from '../hooks/useObservableState';
import { observeConnections } from '../services/connections';
import type { Connection } from '../types/connection';
import { ConnectionsContext } from './connections-context';

const EMPTY_CONNECTIONS: Connection[] = [];

type ConnectionsProviderProps = {
    clientId: string;
    children: ReactNode;
};

export function ConnectionsProvider({ clientId, children }: ConnectionsProviderProps) {
    const connectionsSource = useMemo(() => observeConnections(clientId), [clientId]);
    const connectionsState = useObservableState(connectionsSource, EMPTY_CONNECTIONS);

    return (
        <ConnectionsContext.Provider value={connectionsState}>
            {children}
        </ConnectionsContext.Provider>
    );
}
