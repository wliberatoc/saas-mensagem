import { useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from '@mui/material';

import { createConnection, updateConnection } from '../../../services/connections';
import type { Connection } from '../../../types/connection';

type ConnectionFormDialogProps = {
    clientId: string;
    connection: Connection | null;
    onClose: () => void;
};

export function ConnectionFormDialog({ clientId, connection, onClose }: ConnectionFormDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [name, setName] = useState(connection?.name ?? '');

    function closeDialog() {
        if (!isSaving) onClose();
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const normalizedName = name.trim();
        if (!normalizedName) {
            setErrorMessage('Informe o nome da conexão.');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            if (connection) await updateConnection(connection.id, { name: normalizedName });
            else await createConnection(clientId, { name: normalizedName });

            onClose();
        } catch {
            setErrorMessage(`Não foi possível ${connection ? 'atualizar' : 'criar'} a conexão.`);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open onClose={closeDialog} fullWidth maxWidth="sm">
            <Box component="form" onSubmit={handleSubmit}>
                <DialogTitle>{connection ? 'Editar conexão' : 'Nova conexão'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ pt: 1 }}>
                        {errorMessage && (
                            <Alert severity="error" onClose={() => setErrorMessage('')}>
                                {errorMessage}
                            </Alert>
                        )}
                        <TextField
                            label="Nome"
                            value={name}
                            onChange={event => setName(event.target.value)}
                            required
                            autoFocus
                            fullWidth
                            slotProps={{ htmlInput: { maxLength: 120 } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={closeDialog} disabled={isSaving} sx={{ textTransform: 'none' }}>
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
    );
}
