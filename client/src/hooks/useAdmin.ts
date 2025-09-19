import { useState, useEffect } from "react";

export function useAdmin() {
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

  return {
    isAdmin,
    isAdminModalOpen,
    openAdminModal,
    closeAdminModal,
    login,
    logout,
  };
}
