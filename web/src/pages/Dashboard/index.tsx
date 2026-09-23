import { Avatar, Button, Typography } from '@mui/material';
import { useState } from 'react';

import { ConnectionsSection } from '../../components/ConnectionsSection';
import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../services/auth';

export function DashboardPage() {
    const { user } = useAuth();
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleLogout() {
        setIsSigningOut(true);
        try { await logout(); } finally { setIsSigningOut(false); }
    }

    const userInitial = user?.email?.charAt(0).toUpperCase() ?? 'U';

    return (
        <div className="min-h-screen bg-slate-100 text-slate-950">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-bold text-white">B</div>
                        <div>
                            <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>Broadcast</Typography>
                            <Typography variant="caption" color="text.secondary">Painel de mensagens</Typography>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.email}</Typography>
                            <Typography variant="caption" color="text.secondary">Cliente</Typography>
                        </div>
                        <Avatar sx={{ width: 38, height: 38, bgcolor: '#e0e7ff', color: '#4338ca', fontWeight: 700 }}>{userInitial}</Avatar>
                        <Button color="inherit" onClick={handleLogout} disabled={isSigningOut} sx={{ textTransform: 'none' }}>Sair</Button>
                    </div>
                </div>
            </header>
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
