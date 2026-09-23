import { useEffect, useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';

import {
    createContact,
    deleteContact,
    subscribeToContacts,
    updateContact,
} from '../services/contacts';
import type { Contact } from '../types/contact';
import type { Connection } from '../types/connection';

type ContactsSectionProps = {
    clientId: string;
    connectionId: string;
    connections: Connection[];
};

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (!digits) {
        return '';
    }

    if (digits.length <= 2) {
        return `(${digits}`;
    }

    const areaCode = digits.slice(0, 2);
    const number = digits.slice(2);

    if (number.length <= 4) {
        return `(${areaCode}) ${number}`;
    }

    const prefixLength = number.length <= 8 ? 4 : 5;

    return `(${areaCode}) ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
}

export function ContactsSection({ clientId, connectionId, connections }: ContactsSectionProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [formErrorMessage, setFormErrorMessage] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedConnectionId, setSelectedConnectionId] = useState(connectionId);

    useEffect(() => {
        return subscribeToContacts(
            clientId,
            connectionId,
            (updatedContacts) => {
                setContacts(updatedContacts);
                setIsLoading(false);
            },
            () => {
                setErrorMessage('Não foi possível carregar seus contatos. Verifique as regras do Firestore.');
                setIsLoading(false);
            },
        );
    }, [clientId, connectionId]);

    function openCreateForm() {
        setEditingContact(null);
        setName('');
        setPhone('');
        setSelectedConnectionId(connectionId);
        setFormErrorMessage('');
        setIsFormOpen(true);
    }

    function openEditForm(contact: Contact) {
        setEditingContact(contact);
        setName(contact.name);
        setPhone(formatPhone(contact.phone));
        setSelectedConnectionId(contact.connectionId);
        setFormErrorMessage('');
        setIsFormOpen(true);
    }

    function closeForm() {
        if (!isSaving) {
            setIsFormOpen(false);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormErrorMessage('');

        const normalizedName = name.trim();
        const normalizedPhone = phone.trim();

        if (!normalizedName || !normalizedPhone) {
            setFormErrorMessage('Preencha o nome e o telefone.');
            return;
        }

        if (!editingContact && !selectedConnectionId) {
            setFormErrorMessage('Selecione a conexão.');
            return;
        }

        setIsSaving(true);

        try {
            if (editingContact) {
                await updateContact(editingContact.id, {
                    name: normalizedName,
                    phone: normalizedPhone,
                });
            } else {
                await createContact(clientId, {
                    connectionId: selectedConnectionId,
                    name: normalizedName,
                    phone: normalizedPhone,
                });
            }

            setIsFormOpen(false);
        } catch {
            setFormErrorMessage(`Não foi possível ${editingContact ? 'atualizar' : 'criar'} o contato.`);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!contactToDelete) {
            return;
        }

        setErrorMessage('');
        setIsDeleting(true);

        try {
            await deleteContact(contactToDelete.id);
            setContactToDelete(null);
        } catch {
            setErrorMessage('Não foi possível excluir o contato.');
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
                        Seus contatos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {contacts.length} {contacts.length === 1 ? 'contato cadastrado' : 'contatos cadastrados'}.
                    </Typography>
                </div>
                <Button
                    variant="contained"
                    onClick={openCreateForm}
                    sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, textTransform: 'none', fontWeight: 700 }}
                >
                    Novo contato
                </Button>
            </div>

            {errorMessage && (
                <Alert severity="error" className="mb-5" onClose={() => setErrorMessage('')}>
                    {errorMessage}
                </Alert>
            )}

            {isLoading ? (
                <Box className="grid min-h-48 place-items-center">
                    <Stack spacing={2} sx={{ alignItems: 'center' }}>
                        <CircularProgress />
                        <Typography color="text.secondary">Carregando contatos...</Typography>
                    </Stack>
                </Box>
            ) : contacts.length === 0 ? (
                <Paper
                    elevation={0}
                    className="grid min-h-48 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"
                >
                    <div>
                        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-xl font-bold text-violet-600">
                            0
                        </div>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Nenhum contato cadastrado</Typography>
                        <Typography className="mt-1" color="text.secondary">
                            Adicione seu primeiro contato para começar.
                        </Typography>
                    </div>
                </Paper>
            ) : (
                <TableContainer component={Paper} elevation={0} className="rounded-2xl border border-slate-200">
                    <Table aria-label="Lista de contatos">
                        <TableHead>
                            <TableRow className="bg-slate-50">
                                <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Telefone</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {contacts.map((contact) => (
                                <TableRow key={contact.id} hover>
                                    <TableCell>{contact.name}</TableCell>
                                    <TableCell>{contact.phone}</TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            onClick={() => openEditForm(contact)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => setContactToDelete(contact)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Excluir
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={isFormOpen} onClose={closeForm} fullWidth maxWidth="sm">
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogTitle>{editingContact ? 'Editar contato' : 'Novo contato'}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ pt: 1 }}>
                            {formErrorMessage && (
                                <Alert severity="error" onClose={() => setFormErrorMessage('')}>
                                    {formErrorMessage}
                                </Alert>
                            )}
                            {!editingContact && (
                                <FormControl fullWidth required>
                                    <InputLabel id="contact-connection-label">Conexão</InputLabel>
                                    <Select
                                        labelId="contact-connection-label"
                                        label="Conexão"
                                        value={selectedConnectionId}
                                        onChange={(event) => setSelectedConnectionId(event.target.value)}
                                    >
                                        {connections.map((connection) => (
                                            <MenuItem key={connection.id} value={connection.id}>{connection.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            <TextField
                                label="Nome"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                autoFocus
                                required
                                fullWidth
                                slotProps={{ htmlInput: { maxLength: 120 } }}
                            />
                            <TextField
                                label="Telefone"
                                type="tel"
                                value={phone}
                                onChange={(event) => setPhone(formatPhone(event.target.value))}
                                placeholder="(11) 99999-9999"
                                required
                                fullWidth
                                slotProps={{
                                    htmlInput: {
                                        inputMode: 'numeric',
                                        maxLength: 15,
                                    },
                                }}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={closeForm} disabled={isSaving} sx={{ textTransform: 'none' }}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={isSaving}
                            sx={{ minWidth: 100, textTransform: 'none', fontWeight: 700 }}
                        >
                            {isSaving ? <CircularProgress size={21} color="inherit" /> : 'Salvar'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog
                open={Boolean(contactToDelete)}
                onClose={() => !isDeleting && setContactToDelete(null)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Excluir contato?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        O contato <strong>{contactToDelete?.name}</strong> será excluído permanentemente.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => setContactToDelete(null)}
                        disabled={isDeleting}
                        sx={{ textTransform: 'none' }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        sx={{ minWidth: 100, textTransform: 'none', fontWeight: 700 }}
                    >
                        {isDeleting ? <CircularProgress size={21} color="inherit" /> : 'Excluir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </section>
    );
}
