import { useState } from 'react';
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';

import { deleteConnection } from '../../../services/connections';
import type { Connection } from '../../../types/connection';

type DeleteConnectionDialogProps = {
    clientId: string;
    connection: Connection | null;
    onClose: () => void;
    onError: (message: string) => void;
};

export function DeleteConnectionDialog({ clientId, connection, onClose, onError }: DeleteConnectionDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    function closeDialog() {
        if (!isDeleting) onClose();
    }

    async function handleDelete() {
        if (!connection) return;

        onError('');
        setIsDeleting(true);

        try {
            await deleteConnection(clientId, connection.id);
            onClose();
        } catch {
            onError('Não foi possível excluir a conexão.');
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Dialog open={Boolean(connection)} onClose={closeDialog} fullWidth maxWidth="xs">
            <DialogTitle>Excluir conexão?</DialogTitle>
            <DialogContent>
                <Typography color="text.secondary">
                    A conexão <strong>{connection?.name}</strong> será excluída permanentemente, você perderá os dados
                    associados como contatos e mensagens.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={closeDialog} disabled={isDeleting} sx={{ textTransform: 'none' }}>
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
    );
}
