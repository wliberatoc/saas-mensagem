import { useContext } from 'react';

import { ConnectionsContext } from '../contexts/connections-context';

export function useConnections() {
    const context = useContext(ConnectionsContext);

    if (!context) {
        throw new Error('useConnections deve ser utilizado dentro de ConnectionsProvider');
    }

    return context;
}
