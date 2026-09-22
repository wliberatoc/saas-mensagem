import { useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { FirebaseError } from 'firebase/app';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { login as loginWithEmailAndPassword } from '../../services/auth';

type LoginLocationState = {
    from?: string;
};

function getLoginErrorMessage(error: unknown) {
    if (!(error instanceof FirebaseError)) {
        return 'Não foi possível entrar. Tente novamente.';
    }

    const messages: Record<string, string> = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/invalid-email': 'Informe um endereço de e-mail válido.',
        'auth/network-request-failed': 'Verifique sua conexão com a internet.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
        'auth/user-disabled': 'Este usuário está desativado.',
    };

    return messages[error.code] ?? 'Não foi possível entrar. Tente novamente.';
}

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);

        try {
            await loginWithEmailAndPassword(email.trim(), password);
            const state = location.state as LoginLocationState | null;
            navigate(state?.from ?? '/dashboard', { replace: true });
        } catch (error) {
            setErrorMessage(getLoginErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
            <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -right-20 bottom-16 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />

                <div className="relative flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/25">
                        B
                    </div>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Broadcast</Typography>
                </div>

                <div className="relative max-w-xl">
                    <Typography
                        component="h1"
                        sx={{ fontSize: { lg: '3.25rem', xl: '4rem' }, fontWeight: 700, lineHeight: 1.08 }}
                    >
                        Mensagens certas, para as pessoas certas.
                    </Typography>
                    <Typography className="mt-6 max-w-lg text-white/70" sx={{ fontSize: '1.1rem' }}>
                        Organize conexões, contatos e campanhas em um único lugar.
                    </Typography>
                </div>

                <Typography className="relative text-white/45" variant="body2">
                    Comunicação simples e organizada.
                </Typography>
            </section>

            <section className="flex items-center justify-center bg-slate-50 px-5 py-12 sm:px-10">
                <Box className="w-full max-w-md">
                    <div className="mb-10 flex items-center gap-3 lg:hidden">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-bold text-white">B</div>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Broadcast</Typography>
                    </div>

                    <Paper
                        component="form"
                        onSubmit={handleSubmit}
                        elevation={0}
                        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9"
                    >
                        <Stack spacing={3}>
                            <div>
                                <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
                                    Bem-vindo de volta
                                </Typography>
                                <Typography className="mt-2" color="text.secondary">
                                    Entre com suas credenciais para continuar.
                                </Typography>
                            </div>

                            {errorMessage && (
                                <Alert severity="error" onClose={() => setErrorMessage('')}>
                                    {errorMessage}
                                </Alert>
                            )}

                            <TextField
                                label="E-mail"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                                autoFocus
                                required
                                fullWidth
                            />
                            <TextField
                                label="Senha"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                required
                                fullWidth
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={isSubmitting}
                                sx={{ minHeight: 48, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                            >
                                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
                            </Button>
                        </Stack>
                    </Paper>
                </Box>
            </section>
        </main>
    );
}
