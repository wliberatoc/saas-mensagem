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
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
} from '@mui/material';

import { createContact, updateContact } from '../../../services/contacts';
import type { Contact } from '../../../types/contact';
import type { Connection } from '../../../types/connection';
import { formatPhone } from '../../../utils/phone';

type ContactFormDialogProps = {
	clientId: string;
	connectionId: string;
	connections: Connection[];
	contact: Contact | null;
	onClose: () => void;
};

export function ContactFormDialog({
	clientId,
	connectionId,
	connections,
	contact,
	onClose,
}: ContactFormDialogProps) {
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [name, setName] = useState(contact?.name ?? '');
	const [phone, setPhone] = useState(contact ? formatPhone(contact.phone) : '');
	const [selectedConnectionId, setSelectedConnectionId] = useState(contact?.connectionId ?? connectionId);

	function closeDialog() {
		if (!isSaving) onClose();
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage('');

		const normalizedName = name.trim();
		const normalizedPhone = phone.trim();

		if (!normalizedName || !normalizedPhone) {
			setErrorMessage('Preencha o nome e o telefone.');
			return;
		}

		if (!contact && !selectedConnectionId) {
			setErrorMessage('Selecione a conexão.');
			return;
		}

		setIsSaving(true);

		try {
			if (contact) {
				await updateContact(clientId, contact.id, {
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

			onClose();
		} catch {
			setErrorMessage(`Não foi possível ${contact ? 'atualizar' : 'criar'} o contato.`);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<Dialog open onClose={closeDialog} fullWidth maxWidth="sm">
			<Box component="form" onSubmit={handleSubmit}>
				<DialogTitle>{contact ? 'Editar contato' : 'Novo contato'}</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ pt: 1 }}>
						{errorMessage && (
							<Alert severity="error" onClose={() => setErrorMessage('')}>
								{errorMessage}
							</Alert>
						)}
						{!contact && (
							<FormControl fullWidth required>
								<InputLabel id="contact-connection-label">Conexão</InputLabel>
								<Select
									labelId="contact-connection-label"
									label="Conexão"
									value={selectedConnectionId}
									onChange={event => setSelectedConnectionId(event.target.value)}
								>
									{connections.map(connection => (
										<MenuItem key={connection.id} value={connection.id}>
											{connection.name}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}
						<TextField
							label="Nome"
							value={name}
							onChange={event => setName(event.target.value)}
							autoFocus
							required
							fullWidth
							slotProps={{ htmlInput: { maxLength: 120 } }}
						/>
						<TextField
							label="Telefone"
							type="tel"
							value={phone}
							onChange={event => setPhone(formatPhone(event.target.value))}
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
