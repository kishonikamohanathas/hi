import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'register';
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('georesq_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('georesq_token');
      if (storedToken) {
        try {
          const res = await api.getCurrentUser();
          setUser(res.user);
        } catch {
          localStorage.removeItem('georesq_token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Automatically sign in as citizen for rich immediate interactive exploration
        try {
          const res = await api.demoLogin('citizen');
          localStorage.setItem('georesq_token', res.token);
          setToken(res.token);
          setUser(res.user);
        } catch {
          // ignore
        }
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('georesq_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setIsAuthModalOpen(false);
    showToast(`Welcome back, ${res.user.full_name}!`, 'success');
  };

  const register = async (userData: any) => {
    const res = await api.register(userData);
    localStorage.setItem('georesq_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setIsAuthModalOpen(false);
    showToast(`Account registered successfully as ${res.user.role}!`, 'success');
  };

  const demoLogin = async (role: UserRole) => {
    try {
      const res = await api.demoLogin(role);
      localStorage.setItem('georesq_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      showToast(`Switched to ${role.toUpperCase()} persona (${res.user.full_name})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Demo login failed', 'error');
    }
  };

  const logout = () => {
    localStorage.removeItem('georesq_token');
    setToken(null);
    setUser(null);
    showToast('Signed out successfully.', 'info');
  };

  const updateProfile = async (profile: Partial<User>) => {
    const res = await api.updateProfile(profile);
    setUser(res.user);
    showToast('Profile updated successfully', 'success');
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        demoLogin,
        logout,
        updateProfile,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        toast,
        showToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
