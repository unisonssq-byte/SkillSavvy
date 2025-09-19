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
    if (isAdmin) {
      // If already admin, show logout confirmation or admin panel
      logout();
    } else {
      setIsAdminModalOpen(true);
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
