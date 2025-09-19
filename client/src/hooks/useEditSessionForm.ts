import { useState, useEffect } from 'react';
import { useEditSession } from '@/contexts/EditSessionContext';

/**
 * Hook for managing form state with the edit session provider
 * Tracks changes and updates pending operations automatically
 */
export function useEditSessionForm<T extends Record<string, any>>(
  itemId: string,
  itemType: 'page' | 'block' | 'media',
  initialData: T,
  operationType: 'create' | 'update' = 'update'
) {
  const editSession = useEditSession();
  
  // Check if there are pending changes for this item
  const pendingOperation = editSession.getPendingChangesForItem(itemId, itemType);
  
  // Initialize form data with pending changes or original data
  const [formData, setFormData] = useState<T>(() => {
    if (pendingOperation && pendingOperation.data) {
      return { ...initialData, ...pendingOperation.data };
    }
    return initialData;
  });

  // Track if form has been modified from initial state
  const [isModified, setIsModified] = useState(false);

  // Update form data when initial data changes (e.g., fresh API data)
  useEffect(() => {
    if (!pendingOperation) {
      setFormData(initialData);
      setIsModified(false);
    }
  }, [initialData, pendingOperation]);

  // Function to update form data and track pending changes
  const updateFormData = (updates: Partial<T>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    setIsModified(true);

    // Update or add pending operation
    const operationTypeWithAction = `${itemType}_${operationType}` as any;
    
    editSession.addOperation({
      id: itemId,
      type: operationTypeWithAction,
      data: newFormData,
      originalData: initialData,
    });
  };

  // Function to revert changes
  const revertChanges = () => {
    setFormData(initialData);
    setIsModified(false);
    editSession.removeOperation(itemId);
  };

  // Function to discard pending changes
  const discardChanges = () => {
    editSession.removeOperation(itemId);
    setFormData(initialData);
    setIsModified(false);
  };

  // Function to check if current form has unsaved changes
  const hasUnsavedChanges = () => {
    return editSession.hasPendingChanges(itemId, itemType) || isModified;
  };

  return {
    formData,
    setFormData,
    updateFormData,
    revertChanges,
    discardChanges,
    hasUnsavedChanges,
    isModified,
    hasPendingChanges: editSession.hasPendingChanges(itemId, itemType),
    pendingOperation,
  };
}

/**
 * Hook for creating new items with edit session tracking
 */
export function useEditSessionCreate<T extends Record<string, any>>(
  itemType: 'page' | 'block' | 'media',
  initialData: T
) {
  const editSession = useEditSession();
  const [formData, setFormData] = useState<T>(initialData);
  const [tempId] = useState(() => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const updateFormData = (updates: Partial<T>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);

    const operationTypeWithAction = `${itemType}_create` as any;
    
    editSession.addOperation({
      id: tempId,
      type: operationTypeWithAction,
      data: newFormData,
      originalData: initialData,
    });
  };

  const discardCreate = () => {
    editSession.removeOperation(tempId);
    setFormData(initialData);
  };

  return {
    tempId,
    formData,
    setFormData,
    updateFormData,
    discardCreate,
    hasPendingChanges: editSession.hasPendingChanges(tempId, itemType),
  };
}