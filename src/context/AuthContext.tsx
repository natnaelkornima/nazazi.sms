'use client';

import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'user' | 'admin';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  plan: string;
  avatar: string;
}

interface AuthContextType {
  user: UserAccount | null;
  login: (email?: string, password?: string, role?: UserRole, name?: string, phone?: string) => void;
  updateUserPhone: (newPhone: string) => void;
  loginAsUser: () => void;
  loginAsAdmin: () => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const DEFAULT_USER: UserAccount = {
  id: 'usr_01',
  name: 'Korni Mah',
  email: 'kornimah@gmail.com',
  phone: '+251 91 123 4567',
  role: 'user',
  plan: '3 Months Access Plan',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
};

const DEFAULT_ADMIN: UserAccount = {
  id: 'adm_01',
  name: 'System Admin',
  email: 'admin@nazazi.io',
  phone: '+251 90 000 0000',
  role: 'admin',
  plan: 'Administrator Account',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to null (signed-out public landing page state with features & pricing)
  const [user, setUser] = useState<UserAccount | null>(null);

  const loginAsUser = () => {
    setUser(DEFAULT_USER);
  };

  const loginAsAdmin = () => {
    setUser(DEFAULT_ADMIN);
  };

  const login = (email?: string, password?: string, role: UserRole = 'user', name?: string, phone?: string) => {
    if (role === 'admin' || (email && email.toLowerCase().includes('admin'))) {
      setUser(DEFAULT_ADMIN);
    } else {
      setUser({
        ...DEFAULT_USER,
        email: email || DEFAULT_USER.email,
        name: name || DEFAULT_USER.name,
        phone: phone || DEFAULT_USER.phone,
      });
    }
  };

  const updateUserPhone = (newPhone: string) => {
    if (user) {
      setUser({ ...user, phone: newPhone });
    }
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (role === 'admin') {
      setUser(DEFAULT_ADMIN);
    } else {
      setUser(DEFAULT_USER);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUserPhone, loginAsUser, loginAsAdmin, logout, switchRole }}>
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
