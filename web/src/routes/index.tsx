import { CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { ScheduledMessagesProcessor } from '../components/ScheduledMessagesProcessor';
import { ConnectionsProvider } from '../contexts/ConnectionsProvider';
import { useAuth } from '../hooks/useAuth';
import { DashboardPage } from '../pages/Dashboard';
import { ConnectionDetailsPage } from '../pages/ConnectionDetails';
import { LoginPage } from '../pages/Login';
import { RegisterPage } from '../pages/Register';

export const AppRoutes = () => {
    const { loading, user } = useAuth();

    if (loading) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-50">
                <CircularProgress aria-label="Verificando autenticação" />
            </div>
        );
    }

    const routes = (
        <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/cadastro" element={<RegisterPage />} />
                <Route
                    path="/dashboard"
                    element={(
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="/conexoes/:connectionId"
                    element={(
                        <ProtectedRoute>
                            <ConnectionDetailsPage />
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="*"
                    element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
                />
        </Routes>
    );

    if (!user) return routes;

    return (
        <ConnectionsProvider clientId={user.uid}>
            <ScheduledMessagesProcessor clientId={user.uid} />
            {routes}
        </ConnectionsProvider>
    );
};
