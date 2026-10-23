import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import {
    Alert, Box, Button, Card, CardActions, CardContent, Checkbox,
    Chip, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, FormControlLabel, FormGroup, Paper, Stack, Switch,
    TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';

import type { AsyncState } from '../hooks/useObservableState';
import { useObservableState } from '../hooks/useObservableState';
import {
    createMessages,
    deleteMessage,
    loadMoreMessages,
    observeMessages,
    synchronizeMessageRecipientNames,
    updateScheduledMessage,
    type MessageCursor,
    type MessagePage,
} from '../services/messages';
import type { Contact } from '../types/contact';
import type { Message, MessageFilter } from '../types/message';

type MessagesSectionProps = {
    clientId: string;
    connectionId: string;
    contactsState: AsyncState<Contact[]>;
};

type MessagesSectionContentProps = MessagesSectionProps & {
    filter: MessageFilter;
    onFilterChange: (filter: MessageFilter) => void;
};

const EMPTY_MESSAGE_PAGE: MessagePage = {
    items: [],
    cursor: null,
    hasMore: false,
};

function defaultScheduledAt() {
    const date = new Date(Date.now() + 5 * 60 * 1000);
    date.setSeconds(0, 0);
    return toDateTimeLocal(date);
}

function toDateTimeLocal(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date | null) {
    if (!date) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function mergeMessages(liveMessages: Message[], historicalMessages: Message[]) {
    const seen = new Set<string>();

    return [...liveMessages, ...historicalMessages].filter((message) => {
        if (seen.has(message.id)) return false;
        seen.add(message.id);
        return true;
    });
}

export function MessagesSection({ clientId, connectionId, contactsState }: MessagesSectionProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const statusParam = searchParams.get('status');
    const filter: MessageFilter = statusParam === 'scheduled' || statusParam === 'sent'
        ? statusParam
        : 'all';

    function handleFilterChange(value: MessageFilter) {
        const updatedParams = new URLSearchParams(searchParams);

        if (value === 'all') updatedParams.delete('status');
        else updatedParams.set('status', value);

        setSearchParams(updatedParams, { replace: true });
    }

    return (
        <MessagesSectionContent
            key={`${clientId}:${connectionId}:${filter}`}
            clientId={clientId}
            connectionId={connectionId}
            contactsState={contactsState}
            filter={filter}
            onFilterChange={handleFilterChange}
        />
    );
}

function MessagesSectionContent({
    clientId,
    connectionId,
    contactsState,
    filter,
    onFilterChange,
}: MessagesSectionContentProps) {
    const contacts = contactsState.data;
    const firstPageSource = useMemo(
        () => observeMessages(clientId, connectionId, filter),
        [clientId, connectionId, filter],
    );
    const firstPageState = useObservableState(firstPageSource, EMPTY_MESSAGE_PAGE);
    const [historicalMessages, setHistoricalMessages] = useState<Message[]>([]);
    const [historyCursor, setHistoryCursor] = useState<MessageCursor | null>(null);
    const [historyHasMore, setHistoryHasMore] = useState(false);
    const [historyStarted, setHistoryStarted] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [loadMoreError, setLoadMoreError] = useState('');
    const [formErrorMessage, setFormErrorMessage] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [content, setContent] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt());
    const messages = useMemo(
        () => mergeMessages(firstPageState.data.items, historicalMessages),
        [firstPageState.data.items, historicalMessages],
    );
    const isLoading = firstPageState.status === 'loading' || contactsState.status === 'loading';
    const canLoadMore = historyStarted ? historyHasMore : firstPageState.data.hasMore;

    useEffect(() => {
        void synchronizeMessageRecipientNames(messages, contacts).catch((error: unknown) => {
            console.error('Não foi possível sincronizar os nomes dos contatos nas mensagens.', error);
        });
    }, [contacts, messages]);

    function openCreateForm() {
        setEditingMessage(null);
        setContent('');
        setSelectedContactIds([]);
        setIsScheduled(false);
        setScheduledAt(defaultScheduledAt());
        setFormErrorMessage('');
        setIsFormOpen(true);
    }

    function openEditForm(message: Message) {
        setEditingMessage(message);
        setContent(message.content);
        setSelectedContactIds([message.recipient.contactId]);
        setIsScheduled(true);
        setScheduledAt(message.scheduledAt ? toDateTimeLocal(message.scheduledAt.toDate()) : defaultScheduledAt());
        setFormErrorMessage('');
        setIsFormOpen(true);
    }

    function toggleContact(contactId: string) {
        if (editingMessage) {
            setSelectedContactIds([contactId]);
            return;
        }

        setSelectedContactIds((current) => current.includes(contactId)
            ? current.filter((id) => id !== contactId)
            : [...current, contactId]);
    }

    async function handleLoadMore() {
        const cursor = historyStarted ? historyCursor : firstPageState.data.cursor;
        if (!cursor || isLoadingMore) return;

        setIsLoadingMore(true);
        setLoadMoreError('');

        try {
            const page = await loadMoreMessages(clientId, connectionId, filter, cursor);
            const boundaryMessage = historyStarted ? null : firstPageState.data.items.at(-1) ?? null;

            setHistoricalMessages((current) => mergeMessages(
                current,
                [...(boundaryMessage ? [boundaryMessage] : []), ...page.items],
            ));
            setHistoryCursor(page.cursor);
            setHistoryHasMore(page.hasMore);
            setHistoryStarted(true);
        } catch {
            setLoadMoreError('Não foi possível carregar mais mensagens.');
        } finally {
            setIsLoadingMore(false);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const normalizedContent = content.trim();
        const recipients = contacts
            .filter((contact) => selectedContactIds.includes(contact.id))
            .map((contact) => ({ contactId: contact.id, name: contact.name, phone: contact.phone }));
        const scheduledDate = isScheduled ? new Date(scheduledAt) : null;

        if (!normalizedContent) {
            setFormErrorMessage('Digite o conteúdo da mensagem.');
            return;
        }
        if (recipients.length === 0) {
            setFormErrorMessage('Selecione ao menos um contato desta conexão.');
            return;
        }
        if (editingMessage && recipients.length !== 1) {
            setFormErrorMessage('Selecione um destinatário para esta mensagem.');
            return;
        }
        if (isScheduled && (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date())) {
            setFormErrorMessage('Escolha uma data futura para o agendamento.');
            return;
        }

        setIsSaving(true);
        setFormErrorMessage('');
        try {
            if (editingMessage && scheduledDate) {
                await updateScheduledMessage(editingMessage.id, {
                    content: normalizedContent,
                    recipient: recipients[0],
                    scheduledAt: scheduledDate,
                });
                setHistoricalMessages((current) => current.map((message) => (
                    message.id === editingMessage.id
                        ? {
                            ...message,
                            content: normalizedContent,
                            recipient: recipients[0],
                            scheduledAt: Timestamp.fromDate(scheduledDate),
                        }
                        : message
                )));
            } else {
                await createMessages(clientId, connectionId, recipients.map((recipient) => ({
                    content: normalizedContent,
                    recipient,
                    scheduledAt: scheduledDate,
                })));
            }
            setIsFormOpen(false);
        } catch {
            setFormErrorMessage(`Não foi possível ${editingMessage ? 'atualizar' : 'criar'} a mensagem.`);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!messageToDelete) return;
        setIsDeleting(true);
        setErrorMessage('');
        try {
            await deleteMessage(messageToDelete.id);
            setHistoricalMessages((current) => (
                current.filter((message) => message.id !== messageToDelete.id)
            ));
            setMessageToDelete(null);
        } catch {
            setErrorMessage('Não foi possível excluir a mensagem.');
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>Mensagens</Typography>
                    <Typography variant="body2" color="text.secondary">Envie agora ou agende um envio simulado.</Typography>
                </div>
                <Button variant="contained" onClick={openCreateForm} disabled={contacts.length === 0} sx={{ textTransform: 'none', fontWeight: 700 }}>Nova mensagem</Button>
            </div>

            {contacts.length === 0 && !isLoading && <Alert severity="info" className="mb-5">Cadastre ao menos um contato nesta conexão para criar mensagens.</Alert>}
            {contactsState.status === 'error' && <Alert severity="error" className="mb-5">Não foi possível carregar os contatos disponíveis.</Alert>}
            {firstPageState.status === 'error' && <Alert severity="error" className="mb-5">Não foi possível carregar as mensagens.</Alert>}
            {errorMessage && <Alert severity="error" className="mb-5" onClose={() => setErrorMessage('')}>{errorMessage}</Alert>}
            {loadMoreError && <Alert severity="error" className="mb-5" onClose={() => setLoadMoreError('')}>{loadMoreError}</Alert>}

            <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_, value: MessageFilter | null) => value && onFilterChange(value)} sx={{ mb: 3 }}>
                <ToggleButton value="all">Todas</ToggleButton>
                <ToggleButton value="scheduled">Agendadas</ToggleButton>
                <ToggleButton value="sent">Enviadas</ToggleButton>
            </ToggleButtonGroup>

            {isLoading ? (
                <Box className="grid min-h-48 place-items-center"><CircularProgress /></Box>
            ) : firstPageState.status === 'error' ? null : messages.length === 0 ? (
                <Paper elevation={0} className="grid min-h-48 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <Typography color="text.secondary">Nenhuma mensagem encontrada neste filtro.</Typography>
                </Paper>
            ) : (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {messages.map((message) => {
                            const contact = contacts.find(({ id }) => id === message.recipient.contactId);
                            const hasOldPhone = Boolean(contact && contact.phone !== message.recipient.phone);
                            const recipientName = contact?.name ?? message.recipient.name ?? 'Contato não encontrado';

                            return (
                                <Card key={message.id} variant="outlined" className="rounded-2xl border-slate-200">
                                    <CardContent>
                                        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Chip size="small" color={message.status === 'sent' ? 'success' : 'warning'} label={message.status === 'sent' ? 'Enviada' : 'Agendada'} />
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate((message.sentAt ?? message.scheduledAt ?? message.createdAt)?.toDate() ?? null)}
                                            </Typography>
                                        </Stack>
                                        <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                            Para:{' '}
                                            {contact ? recipientName : (
                                                <Box component="span" title="contato excluído" sx={{ color: '#a0a0a1' }}>
                                                    {recipientName}
                                                </Box>
                                            )}
                                            {!contact && (
                                                <Box component="span" title="contato excluído" sx={{ color: '#a0a0a1' }}>
                                                    {' '}{message.recipient.phone}
                                                </Box>
                                            )}
                                            {contact && hasOldPhone && (
                                                <Box component="span" title="número antigo" sx={{ color: '#a0a0a1' }}>
                                                    {' '}{message.recipient.phone}
                                                </Box>
                                            )}
                                        </Typography>
                                    </CardContent>
                                    <CardActions>
                                        {message.status === 'scheduled' && <Button onClick={() => openEditForm(message)}>Editar</Button>}
                                        <Button color="error" onClick={() => setMessageToDelete(message)}>Excluir</Button>
                                    </CardActions>
                                </Card>
                            );
                        })}
                    </div>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        {canLoadMore ? (
                            <Button variant="outlined" onClick={handleLoadMore} disabled={isLoadingMore}>
                                {isLoadingMore ? <CircularProgress size={21} /> : 'Carregar mais'}
                            </Button>
                        ) : historyStarted ? (
                            <Typography variant="body2" color="text.secondary">Fim do histórico.</Typography>
                        ) : null}
                    </Box>
                </>
            )}

            <Dialog open={isFormOpen} onClose={() => !isSaving && setIsFormOpen(false)} fullWidth maxWidth="sm">
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogTitle>{editingMessage ? 'Editar mensagem agendada' : 'Nova mensagem'}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ pt: 1 }}>
                            {formErrorMessage && <Alert severity="error">{formErrorMessage}</Alert>}
                            <TextField label="Mensagem" value={content} onChange={(event) => setContent(event.target.value)} multiline minRows={4} required slotProps={{ htmlInput: { maxLength: 4000 } }} />
                            <div>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>{editingMessage ? 'Destinatário' : 'Destinatários'}</Typography>
                                <Paper variant="outlined" sx={{ maxHeight: 220, overflow: 'auto', p: 1 }}>
                                    <FormGroup>
                                        {contacts.map((contact) => (
                                            <FormControlLabel key={contact.id} control={<Checkbox checked={selectedContactIds.includes(contact.id)} onChange={() => toggleContact(contact.id)} />} label={`${contact.name} — ${contact.phone}`} />
                                        ))}
                                    </FormGroup>
                                </Paper>
                            </div>
                            <FormControlLabel control={<Switch checked={isScheduled} disabled={Boolean(editingMessage)} onChange={(event) => setIsScheduled(event.target.checked)} />} label="Agendar envio" />
                            {isScheduled && <TextField label="Data e hora do envio" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />}
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={21} color="inherit" /> : editingMessage ? 'Salvar' : isScheduled ? 'Agendar' : 'Enviar agora'}</Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog open={Boolean(messageToDelete)} onClose={() => !isDeleting && setMessageToDelete(null)} fullWidth maxWidth="xs">
                <DialogTitle>Excluir mensagem?</DialogTitle>
                <DialogContent><Typography color="text.secondary">Esta mensagem será excluída permanentemente.</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setMessageToDelete(null)} disabled={isDeleting}>Cancelar</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <CircularProgress size={21} color="inherit" /> : 'Excluir'}</Button>
                </DialogActions>
            </Dialog>
        </section>
    );
}
