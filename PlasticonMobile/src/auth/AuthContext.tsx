import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { api } from '../api/client';
import { AuthResponse, User } from '../api/types';
import { clearSession, getSavedUser, saveToken, saveUser } from './storage';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from AsyncStorage
  useEffect(() => {
    getSavedUser<User>()
      .then((saved) => { if (saved) setUser(saved); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });

    const restored: User = {
      id:         data.userId,
      email:      data.email,
      username:   data.username,
      fullName:   data.fullName,
      role:       data.role,
    };

    await saveToken(data.token);
    await saveUser(restored);
    setUser(restored);
  }, []);

  const logout = useCallback(async () => {
    // Best-effort server-side logout (cookie clear)
    api.post('/auth/logout', {}).catch(() => undefined);
    await clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
