import { useEffect, useState } from 'react';
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from '@mui/material';

import { subscribeToContacts } from '../services/contacts';
import type { Contact } from '../types/contact';
import type { Connection } from '../types/connection';
import { ContactFormDialog } from './modals/Contacts/ContactFormDialog';
import { DeleteContactDialog } from './modals/Contacts/DeleteContactDialog';

type ContactsSectionProps = {
	clientId: string;
	connectionId: string;
	connections: Connection[];
};

export function ContactsSection({ clientId, connectionId, connections }: ContactsSectionProps) {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingContact, setEditingContact] = useState<Contact | null>(null);
	const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

	useEffect(() => {
		return subscribeToContacts(
			clientId,
			connectionId,
			updatedContacts => {
				setContacts(updatedContacts);
				setIsLoading(false);
			},
			() => {
				setErrorMessage('Não foi possível carregar seus contatos. Verifique as regras do Firestore.');
				setIsLoading(false);
			}
		);
	}, [clientId, connectionId]);

	function openCreateForm() {
		setEditingContact(null);
		setIsFormOpen(true);
	}

	function openEditForm(contact: Contact) {
		setEditingContact(contact);
		setIsFormOpen(true);
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
						<Typography variant="h6" sx={{ fontWeight: 700 }}>
							Nenhum contato cadastrado
						</Typography>
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
								<TableCell align="right" sx={{ fontWeight: 700 }}>
									Ações
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{contacts.map(contact => (
								<TableRow key={contact.id} hover>
									<TableCell>{contact.name}</TableCell>
									<TableCell>{contact.phone}</TableCell>
									<TableCell align="right">
										<Button size="small" onClick={() => openEditForm(contact)} sx={{ textTransform: 'none' }}>
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

			{isFormOpen && (
				<ContactFormDialog
					clientId={clientId}
					connectionId={connectionId}
					connections={connections}
					contact={editingContact}
					onClose={() => setIsFormOpen(false)}
				/>
			)}

			<DeleteContactDialog
				contact={contactToDelete}
				onClose={() => setContactToDelete(null)}
				onError={setErrorMessage}
			/>
		</section>
	);
}
