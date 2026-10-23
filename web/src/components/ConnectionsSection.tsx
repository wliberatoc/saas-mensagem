import { useState } from 'react';
import {
    Alert, Box, Button, Card, CardActions, CardContent, CircularProgress,
    Divider, Paper, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useConnections } from '../hooks/useConnections';
import type { Connection } from '../types/connection';
import { ConnectionFormDialog } from './modals/Connections/ConnectionFormDialog';
import { DeleteConnectionDialog } from './modals/Connections/DeleteConnectionDialog';

type ConnectionsSectionProps = { clientId: string };

function formatCreatedAt(connection: Connection) {
    if (!connection.createdAt) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
    }).format(connection.createdAt.toDate());
}

export function ConnectionsSection({ clientId }: ConnectionsSectionProps) {
    const navigate = useNavigate();
    const connectionsState = useConnections();
    const connections = connectionsState.data;
    const isLoading = connectionsState.status === 'loading';
    const [errorMessage, setErrorMessage] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
    const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);

    function openCreateForm() {
        setEditingConnection(null);
        setIsFormOpen(true);
    }

    function openEditForm(connection: Connection) {
        setEditingConnection(connection);
        setIsFormOpen(true);
    }

    return (
        <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>Suas conexões</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {connections.length} {connections.length === 1 ? 'conexão cadastrada' : 'conexões cadastradas'}.
                    </Typography>
                </div>
                <Button variant="contained" onClick={openCreateForm} sx={{ textTransform: 'none', fontWeight: 700 }}>Nova conexão</Button>
            </div>
            {connectionsState.status === 'error' && (
                <Alert severity="error" className="mb-6">
                    Não foi possível carregar suas conexões. Verifique as regras do Firestore.
                </Alert>
            )}
            {errorMessage && <Alert severity="error" className="mb-6" onClose={() => setErrorMessage('')}>{errorMessage}</Alert>}
            {isLoading ? (
                <Box className="grid min-h-64 place-items-center"><CircularProgress /></Box>
            ) : connections.length === 0 ? (
                <Paper elevation={0} className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <div>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Nenhuma conexão cadastrada</Typography>
                        <Typography color="text.secondary">Crie sua primeira conexão para organizar contatos e mensagens.</Typography>
                    </div>
                </Paper>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {connections.map((connection) => (
                        <Card key={connection.id} variant="outlined" className="rounded-2xl border-slate-200">
                            <CardContent className="p-6">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 font-bold text-indigo-700">{connection.name.charAt(0).toUpperCase()}</div>
                                    <Typography noWrap sx={{ fontWeight: 700 }}>{connection.name}</Typography>
                                </div>
                                <Divider />
                                <Typography className="mt-4" variant="caption" color="text.secondary">Criada em {formatCreatedAt(connection)}</Typography>
                            </CardContent>
                            <CardActions sx={{ px: 2, pb: 2 }}>
                                <Button onClick={() => navigate(`/conexoes/${connection.id}`)} sx={{ textTransform: 'none' }}>Abrir</Button>
                                <Button onClick={() => openEditForm(connection)} sx={{ textTransform: 'none' }}>Editar</Button>
                                <Button color="error" onClick={() => setConnectionToDelete(connection)} sx={{ textTransform: 'none' }}>Excluir</Button>
                            </CardActions>
                        </Card>
                    ))}
                </div>
            )}

            {isFormOpen && (
                <ConnectionFormDialog
                    clientId={clientId}
                    connection={editingConnection}
                    onClose={() => setIsFormOpen(false)}
                />
            )}

            <DeleteConnectionDialog
                clientId={clientId}
                connection={connectionToDelete}
                onClose={() => setConnectionToDelete(null)}
                onError={setErrorMessage}
            />
        </section>
    );
}
