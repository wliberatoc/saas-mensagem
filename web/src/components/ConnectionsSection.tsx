import { useEffect, useState, type FormEvent } from 'react';
import {
    Alert, Box, Button, Card, CardActions, CardContent, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper,
    Stack, TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import {
    connectionHasDependencies, createConnection, deleteConnection,
    subscribeToConnections, updateConnection,
} from '../services/connections';
import type { Connection } from '../types/connection';

type ConnectionsSectionProps = { clientId: string };

function formatCreatedAt(connection: Connection) {
    if (!connection.createdAt) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
    }).format(connection.createdAt.toDate());
}

export function ConnectionsSection({ clientId }: ConnectionsSectionProps) {
    const navigate = useNavigate();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [formErrorMessage, setFormErrorMessage] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
    const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);
    const [name, setName] = useState('');

    useEffect(() => subscribeToConnections(
        clientId,
        (updatedConnections) => {
            setConnections(updatedConnections);
            setIsLoading(false);
        },
        () => {
            setErrorMessage('Não foi possível carregar suas conexões. Verifique as regras do Firestore.');
            setIsLoading(false);
        },
    ), [clientId]);

    function openCreateForm() {
        setEditingConnection(null);
        setName('');
        setFormErrorMessage('');
        setIsFormOpen(true);
    }

    function openEditForm(connection: Connection) {
        setEditingConnection(connection);
        setName(connection.name);
        setFormErrorMessage('');
        setIsFormOpen(true);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const normalizedName = name.trim();
        if (!normalizedName) {
            setFormErrorMessage('Informe o nome da conexão.');
            return;
        }

        setIsSaving(true);
        setFormErrorMessage('');
        try {
            if (editingConnection) await updateConnection(editingConnection.id, { name: normalizedName });
            else await createConnection(clientId, { name: normalizedName });
            setIsFormOpen(false);
        } catch {
            setFormErrorMessage(`Não foi possível ${editingConnection ? 'atualizar' : 'criar'} a conexão.`);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!connectionToDelete) return;
        setIsDeleting(true);
        setErrorMessage('');
        try {
            const dependencies = await connectionHasDependencies(clientId, connectionToDelete.id);
            if (dependencies.hasContacts || dependencies.hasMessages) {
                const items = [dependencies.hasContacts ? 'contatos' : '', dependencies.hasMessages ? 'mensagens' : '']
                    .filter(Boolean).join(' e ');
                setErrorMessage(`A conexão não pode ser excluída porque possui ${items}. Exclua-os primeiro.`);
                setConnectionToDelete(null);
                return;
            }
            await deleteConnection(connectionToDelete.id);
            setConnectionToDelete(null);
        } catch {
            setErrorMessage('Não foi possível excluir a conexão.');
        } finally {
            setIsDeleting(false);
        }
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

            <Dialog open={isFormOpen} onClose={() => !isSaving && setIsFormOpen(false)} fullWidth maxWidth="sm">
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogTitle>{editingConnection ? 'Editar conexão' : 'Nova conexão'}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ pt: 1 }}>
                            {formErrorMessage && <Alert severity="error">{formErrorMessage}</Alert>}
                            <TextField label="Nome" value={name} onChange={(event) => setName(event.target.value)} required autoFocus fullWidth slotProps={{ htmlInput: { maxLength: 120 } }} />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSaving} sx={{ minWidth: 100 }}>{isSaving ? <CircularProgress size={21} color="inherit" /> : 'Salvar'}</Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog open={Boolean(connectionToDelete)} onClose={() => !isDeleting && setConnectionToDelete(null)} fullWidth maxWidth="xs">
                <DialogTitle>Excluir conexão?</DialogTitle>
                <DialogContent><Typography color="text.secondary">A conexão <strong>{connectionToDelete?.name}</strong> será excluída permanentemente, você perderá os dados associados como contatos e mensagens.</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setConnectionToDelete(null)} disabled={isDeleting}>Cancelar</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <CircularProgress size={21} color="inherit" /> : 'Excluir'}</Button>
                </DialogActions>
            </Dialog>
        </section>
    );
}
