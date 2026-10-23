import { useMemo } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Tab, Tabs } from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AppHeader } from '../../components/AppHeader';
import { ContactsSection } from '../../components/ContactsSection';
import { MessagesSection } from '../../components/MessagesSection';
import { useAuth } from '../../hooks/useAuth';
import { useConnections } from '../../hooks/useConnections';
import { useObservableState } from '../../hooks/useObservableState';
import { observeConnection } from '../../services/connections';
import { observeContacts } from '../../services/contacts';
import type { Connection } from '../../types/connection';
import type { Contact } from '../../types/contact';

const EMPTY_CONTACTS: Contact[] = [];

type ConnectionDetailsContentProps = {
    clientId: string;
    connectionId: string;
};

type ConnectionWorkspaceProps = ConnectionDetailsContentProps & {
    connection: Connection;
    connections: Connection[];
};

export function ConnectionDetailsPage() {
    const { user } = useAuth();
    const { connectionId } = useParams();

    if (!user || !connectionId) {
        return <ConnectionError message="Conexão não encontrada." />;
    }

    return <ConnectionDetailsContent clientId={user.uid} connectionId={connectionId} />;
}

function ConnectionDetailsContent({ clientId, connectionId }: ConnectionDetailsContentProps) {
    const connectionsState = useConnections();
    const connectionSource = useMemo(
        () => observeConnection(clientId, connectionId),
        [clientId, connectionId],
    );
    const connectionState = useObservableState<Connection | null>(connectionSource, null);

    if (connectionState.status === 'loading') {
        return <Box className="grid min-h-screen place-items-center bg-slate-100"><CircularProgress /></Box>;
    }

    if (connectionState.status === 'error') {
        return <ConnectionError message="Não foi possível carregar a lista de conexões." />;
    }

    if (!connectionState.data) {
        return <ConnectionError message="A conexão não existe ou você não possui acesso a ela." />;
    }

    return (
        <ConnectionWorkspace
            clientId={clientId}
            connectionId={connectionId}
            connection={connectionState.data}
            connections={connectionsState.data}
        />
    );
}

function ConnectionWorkspace({
    clientId,
    connectionId,
    connection,
    connections,
}: ConnectionWorkspaceProps) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const contactsSource = useMemo(
        () => observeContacts(clientId, connectionId),
        [clientId, connectionId],
    );
    const contactsState = useObservableState(contactsSource, EMPTY_CONTACTS);
    const activeTab = searchParams.get('tab') === 'messages' ? 1 : 0;

    function handleTabChange(value: number) {
        const updatedParams = new URLSearchParams(searchParams);

        if (value === 1) updatedParams.set('tab', 'messages');
        else updatedParams.delete('tab');

        setSearchParams(updatedParams, { replace: true });
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-950">
            <AppHeader
                title={connection.name}
                subtitle="Área da conexão"
                backAction={{ label: 'Dashboard', onClick: () => navigate('/dashboard') }}
            />

            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
                <Paper elevation={0} className="mb-8 rounded-2xl border border-slate-200 px-2">
                    <Tabs value={activeTab} onChange={(_, value: number) => handleTabChange(value)} aria-label="Áreas da conexão">
                        <Tab label="Contatos" />
                        <Tab label="Mensagens" />
                    </Tabs>
                </Paper>
                {activeTab === 0 && (
                    <ContactsSection
                        clientId={clientId}
                        connectionId={connectionId}
                        connections={connections}
                        contactsState={contactsState}
                    />
                )}
                {activeTab === 1 && (
                    <MessagesSection
                        clientId={clientId}
                        connectionId={connectionId}
                        contactsState={contactsState}
                    />
                )}
            </main>
        </div>
    );
}

function ConnectionError({ message }: { message: string }) {
    const navigate = useNavigate();

    return (
        <Box className="grid min-h-screen place-items-center bg-slate-100 p-5">
            <Paper elevation={0} className="w-full max-w-lg rounded-3xl border border-slate-200 p-8 text-center">
                <Alert severity="error" sx={{ mb: 3 }}>{message}</Alert>
                <Button variant="contained" onClick={() => navigate('/dashboard')}>Voltar ao dashboard</Button>
            </Paper>
        </Box>
    );
}
