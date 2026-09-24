import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

import { ContactsSection } from '../../components/ContactsSection';
import { MessagesSection } from '../../components/MessagesSection';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToConnection, subscribeToConnections } from '../../services/connections';
import type { Connection } from '../../types/connection';

export function ConnectionDetailsPage() {
    const { user } = useAuth();
    const { connectionId } = useParams();
    const navigate = useNavigate();
    const [connection, setConnection] = useState<Connection | null>(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [activeTab, setActiveTab] = useState(0);

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
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4 sm:px-8">
                    <Button color="inherit" onClick={() => navigate('/dashboard')} sx={{ textTransform: 'none' }}>← Dashboard</Button>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="min-w-0">
                        <Typography noWrap sx={{ fontWeight: 800 }}>{connection.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Área da conexão</Typography>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
                {errorMessage && <Alert severity="error" className="mb-6" onClose={() => setErrorMessage('')}>{errorMessage}</Alert>}
                <Paper elevation={0} className="mb-8 rounded-2xl border border-slate-200 px-2">
                    <Tabs value={activeTab} onChange={(_, value: number) => setActiveTab(value)} aria-label="Áreas da conexão">
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
