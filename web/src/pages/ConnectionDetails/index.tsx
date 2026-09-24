import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Tab, Tabs } from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AppHeader } from '../../components/AppHeader';
import { ContactsSection } from '../../components/ContactsSection';
import { MessagesSection } from '../../components/MessagesSection';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToConnection, subscribeToConnections } from '../../services/connections';
import type { Connection } from '../../types/connection';

export function ConnectionDetailsPage() {
    const { user } = useAuth();
    const { connectionId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [connection, setConnection] = useState<Connection | null>(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const activeTab = searchParams.get('tab') === 'messages' ? 1 : 0;

    function handleTabChange(value: number) {
        const updatedParams = new URLSearchParams(searchParams);

        if (value === 1) updatedParams.set('tab', 'messages');
        else updatedParams.delete('tab');

        setSearchParams(updatedParams, { replace: true });
    }

    useEffect(() => {
        if (!user || !connectionId) {
            return;
        }

        const unsubscribeConnection = subscribeToConnection(
            connectionId,
            user.uid,
            (updatedConnection) => {
                setConnection(updatedConnection);
                setIsLoading(false);
            },
            () => {
                setErrorMessage('A conexão não existe ou você não possui acesso a ela.');
                setIsLoading(false);
            },
        );
        const unsubscribeConnections = subscribeToConnections(user.uid, setConnections, () => {
            setErrorMessage('Não foi possível carregar a lista de conexões.');
        });

        return () => {
            unsubscribeConnection();
            unsubscribeConnections();
        };
    }, [connectionId, user]);

    if (isLoading) {
        return <Box className="grid min-h-screen place-items-center bg-slate-100"><CircularProgress /></Box>;
    }

    if (!user || !connectionId || !connection) {
        return (
            <Box className="grid min-h-screen place-items-center bg-slate-100 p-5">
                <Paper elevation={0} className="w-full max-w-lg rounded-3xl border border-slate-200 p-8 text-center">
                    <Alert severity="error" sx={{ mb: 3 }}>{errorMessage || 'Conexão não encontrada.'}</Alert>
                    <Button variant="contained" onClick={() => navigate('/dashboard')}>Voltar ao dashboard</Button>
                </Paper>
            </Box>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-950">
            <AppHeader
                title={connection.name}
                subtitle="Área da conexão"
                backAction={{ label: 'Dashboard', onClick: () => navigate('/dashboard') }}
            />

            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
                {errorMessage && <Alert severity="error" className="mb-6" onClose={() => setErrorMessage('')}>{errorMessage}</Alert>}
                <Paper elevation={0} className="mb-8 rounded-2xl border border-slate-200 px-2">
                    <Tabs value={activeTab} onChange={(_, value: number) => handleTabChange(value)} aria-label="Áreas da conexão">
                        <Tab label="Contatos" />
                        <Tab label="Mensagens" />
                    </Tabs>
                </Paper>
                {activeTab === 0 && <ContactsSection clientId={user.uid} connectionId={connectionId} connections={connections} />}
                {activeTab === 1 && <MessagesSection clientId={user.uid} connectionId={connectionId} />}
            </main>
        </div>
    );
}
