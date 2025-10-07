import React, { createContext, useContext, useState } from 'react';
import { useOrders } from './OrderContext';

interface User {
  full_name: string;
  email: string;
  dob?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string, dob?: Date) => Promise<{ error: any }>
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
  const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return { error: data.error || 'Login failed' };
      }
      setUser(data.user);
      setToken(data.token);
      setLoading(false);
      return { error: null };
    } catch (err) {
      setLoading(false);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, dob?: Date) => {
    setLoading(true);
    try {
  const res = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, password, dob })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return { error: data.error || 'Signup failed' };
      }
      // Optionally, auto-login after signup
      await signIn(email, password);
      setLoading(false);
      return { error: null };
    } catch (err) {
      setLoading(false);
      return { error: err };
    }
  };

  const { clearOrders } = useOrders();
  const signOut = async () => {
    setUser(null);
    setToken(null);
    clearOrders();
  };

  const value = {
    user,
    token,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}