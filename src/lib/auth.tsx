import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import type { User } from './types';
import { api } from './api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  handleCallback: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('gitmind_user_id');
    if (storedUserId) {
      // Check for simulated user first
      const storedUser = localStorage.getItem('gitmind_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch { /* ignore */ }
        setIsLoading(false);
        return;
      }
      api.verifyUser(storedUserId)
        .then(({ user }) => setUser(user))
        .catch(() => localStorage.removeItem('gitmind_user_id'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const { url } = await api.getAuthUrl(redirectUri);
      window.location.href = url;
    } catch (e: any) {
      // If GitHub OAuth not configured, use simulated login
      console.warn('GitHub OAuth not configured, using simulated login:', e.message);
      const simulatedUser: User = {
        id: crypto.randomUUID(),
        name: 'Developer',
        avatar_url: null,
        github_id: null,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('gitmind_user_id', simulatedUser.id);
      localStorage.setItem('gitmind_user', JSON.stringify(simulatedUser));
      setUser(simulatedUser);
    }
  };

  const handleCallback = async (code: string) => {
    const { user } = await api.authCallback(code);
    localStorage.setItem('gitmind_user_id', user.id);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('gitmind_user_id');
    localStorage.removeItem('gitmind_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, handleCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
