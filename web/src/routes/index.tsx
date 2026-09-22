import { CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../hooks/useAuth';
import { DashboardPage } from '../pages/Dashboard';
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

    return (
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
                path="*"
                element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
            />
        </Routes>
    );
};
