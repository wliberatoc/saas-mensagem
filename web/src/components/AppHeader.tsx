import { useState } from 'react';
import { Avatar, Button, Typography } from '@mui/material';

import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/auth';

type AppHeaderProps = {
    title: string;
    subtitle: string;
    showLogo?: boolean;
    backAction?: {
        label: string;
        onClick: () => void;
    };
};

export function AppHeader({ title, subtitle, showLogo = false, backAction }: AppHeaderProps) {
    const { user } = useAuth();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const userInitial = user?.email?.charAt(0).toUpperCase() ?? 'U';

    async function handleLogout() {
        setIsSigningOut(true);
        try { await logout(); } finally { setIsSigningOut(false); }
    }

    return (
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    {showLogo && (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 font-bold text-white">
                            B
                        </div>
                    )}
                    {backAction && (
                        <>
                            <Button color="inherit" onClick={backAction.onClick} sx={{ textTransform: 'none' }}>
                                ← {backAction.label}
                            </Button>
                            <div className="h-8 w-px shrink-0 bg-slate-200" />
                        </>
                    )}
                    <div className="min-w-0">
                        <Typography noWrap sx={{ fontWeight: 800, lineHeight: 1.1 }}>{title}</Typography>
                        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden text-right sm:block">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.email}</Typography>
                        <Typography variant="caption" color="text.secondary">Cliente</Typography>
                    </div>
                    <Avatar sx={{ width: 38, height: 38, bgcolor: '#e0e7ff', color: '#4338ca', fontWeight: 700 }}>{userInitial}</Avatar>
                    <Button color="inherit" onClick={handleLogout} disabled={isSigningOut} sx={{ textTransform: 'none' }}>
                        Sair
                    </Button>
                </div>
            </div>
        </header>
    );
}
