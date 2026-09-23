import { useEffect, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Paper,
    Stack,
    Typography,
} from '@mui/material';

import { ContactsSection } from '../../components/ContactsSection';
import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../services/auth';
import { subscribeToConnections } from '../../services/connections';
import type { Connection } from '../../types/connection';

function formatCreatedAt(connection: Connection) {
    if (!connection.createdAt) {
        return 'Data não informada';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(connection.createdAt.toDate());
}

export function DashboardPage() {
    const { user } = useAuth();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!user) {
            return;
        }

        return subscribeToConnections(
            user.uid,
            (updatedConnections) => {
                setConnections(updatedConnections);
                setIsLoading(false);
            },
            () => {
                setErrorMessage('Não foi possível carregar suas conexões. Verifique as regras do Firestore.');
                setIsLoading(false);
            },
        );
    }, [user]);

    async function handleLogout() {
        setIsSigningOut(true);

        try {
            await logout();
        } finally {
            setIsSigningOut(false);
        }
    }

    const userInitial = user?.email?.charAt(0).toUpperCase() ?? 'U';

    return (
        <div className="min-h-screen bg-slate-100 text-slate-950">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-bold text-white">B</div>
                        <div>
                            <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>Broadcast</Typography>
                            <Typography variant="caption" color="text.secondary">Painel de mensagens</Typography>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.email}</Typography>
                            <Typography variant="caption" color="text.secondary">Cliente</Typography>
                        </div>
                        <Avatar sx={{ width: 38, height: 38, bgcolor: '#e0e7ff', color: '#4338ca', fontWeight: 700 }}>
                            {userInitial}
                        </Avatar>
                        <Button
                            color="inherit"
                            onClick={handleLogout}
                            disabled={isSigningOut}
                            sx={{ textTransform: 'none' }}
                        >
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>Dashboard</Typography>
                        <Typography className="mt-1" color="text.secondary">
                            Acompanhe as conexões disponíveis na sua conta.
                        </Typography>
                    </div>
                    <Paper elevation={0} className="mt-3 w-fit rounded-2xl border border-slate-200 px-4 py-2 sm:mt-0">
                        <Typography variant="caption" color="text.secondary">Total de conexões</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{connections.length}</Typography>
                    </Paper>
                </div>

                <Divider className="mb-8" />

                <div className="mb-5">
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>Suas conexões</Typography>
                    <Typography variant="body2" color="text.secondary">
                        A lista é atualizada automaticamente pelo Firestore.
                    </Typography>
                </div>

                {errorMessage && <Alert severity="error" className="mb-6">{errorMessage}</Alert>}

                {isLoading ? (
                    <Box className="grid min-h-64 place-items-center">
                        <Stack spacing={2} sx={{ alignItems: 'center' }}>
                            <CircularProgress />
                            <Typography color="text.secondary">Carregando conexões...</Typography>
                        </Stack>
                    </Box>
                ) : connections.length === 0 && !errorMessage ? (
                    <Paper
                        elevation={0}
                        className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"
                    >
                        <div>
                            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-600">0</div>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>Nenhuma conexão encontrada</Typography>
                            <Typography className="mt-1" color="text.secondary">
                                As conexões criadas para sua conta aparecerão aqui.
                            </Typography>
                        </div>
                    </Paper>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {connections.map((connection) => (
                            <Card
                                key={connection.id}
                                variant="outlined"
                                className="rounded-2xl border-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70"
                            >
                                <CardContent className="p-6">
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 font-bold text-indigo-700">
                                            {connection.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <Typography noWrap sx={{ fontWeight: 700 }}>{connection.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">Conexão</Typography>
                                        </div>
                                    </div>
                                    <Divider />
                                    <Typography className="mt-4" variant="caption" color="text.secondary">
                                        Criada em {formatCreatedAt(connection)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {user && (
                    <>
                        <Divider className="my-10" />
                        <ContactsSection clientId={user.uid} />
                    </>
                )}
            </main>
        </div>
    );
}
