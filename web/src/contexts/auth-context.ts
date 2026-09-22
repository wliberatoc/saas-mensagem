import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthContextData = {
    user: User | null;
    loading: boolean;
};

export const AuthContext = createContext<AuthContextData | undefined>(undefined);
