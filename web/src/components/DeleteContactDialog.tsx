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

import { deleteContact } from '../services/contacts';
import type { Contact } from '../types/contact';

type DeleteContactDialogProps = {
	contact: Contact | null;
	onClose: () => void;
	onError: (message: string) => void;
};

export function DeleteContactDialog({ contact, onClose, onError }: DeleteContactDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	function closeDialog() {
		if (!isDeleting) onClose();
	}

	async function handleDelete() {
		if (!contact) return;

		onError('');
		setIsDeleting(true);

		try {
			await deleteContact(contact.id);
			onClose();
		} catch {
			onError('Não foi possível excluir o contato.');
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<Dialog open={Boolean(contact)} onClose={closeDialog} fullWidth maxWidth="xs">
			<DialogTitle>Excluir contato?</DialogTitle>
			<DialogContent>
				<Typography color="text.secondary">
					O contato <strong>{contact?.name}</strong> será excluído permanentemente.
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
