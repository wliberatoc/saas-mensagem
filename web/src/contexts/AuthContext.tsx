import {
    createContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import {
    onAuthStateChanged,
    type User,
} from 'firebase/auth';

import { auth } from '../services/firebase';

type AuthContextData = {
    user: User | null;
    loading: boolean;
};

export const AuthContext = createContext<
    AuthContextData | undefined
>(undefined);

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({
    children,
}: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (currentUser) => {
                setUser(currentUser);
                setLoading(false);
            },
        );

        return unsubscribe;
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}