import React, { useState, useEffect, useContext, createContext } from "react";

interface AdminContextType {
  isAdmin: boolean;
  isAdminModalOpen: boolean;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  login: (token: string) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    // Check if admin token exists in localStorage
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAdmin(true);
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('adminToken', token);
    setIsAdmin(true);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setIsAdmin(false);
  };

  const openAdminModal = () => {
    console.log('openAdminModal called, isAdmin:', isAdmin);
    if (!isAdmin) {
      console.log('Setting modal open to true');
      setIsAdminModalOpen(true);
    } else {
      console.log('User is already admin, not opening modal');
    }
  };

  const closeAdminModal = () => {
    setIsAdminModalOpen(false);
  };

  const value = {
    isAdmin,
    isAdminModalOpen,
    openAdminModal,
    closeAdminModal,
    login,
    logout,
  };

  return React.createElement(AdminContext.Provider, { value }, children);
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
