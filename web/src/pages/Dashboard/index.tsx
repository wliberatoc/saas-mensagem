import { Typography } from '@mui/material';

import { AppHeader } from '../../components/AppHeader';
import { ConnectionsSection } from '../../components/ConnectionsSection';
import { useAuth } from '../../hooks/useAuth';

export function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-100 text-slate-950">
            <AppHeader title="Broadcast" subtitle="Painel de mensagens" showLogo />
            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
                <div className="mb-8">
                    <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>Dashboard</Typography>
                    <Typography className="mt-1" color="text.secondary">Gerencie suas conexões e abra uma delas para acessar contatos e mensagens.</Typography>
                </div>
                {user && <ConnectionsSection clientId={user.uid} />}
            </main>
        </div>
    );
}
