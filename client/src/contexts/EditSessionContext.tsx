import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types for pending operations
export type PendingOperation = {
  id: string;
  type: 'page_create' | 'page_update' | 'page_delete' | 'block_create' | 'block_update' | 'block_delete' | 'media_create' | 'media_delete';
  data?: any;
  originalData?: any; // Store original data for reverting changes
  timestamp: string;
};

export type EditSessionState = {
  pendingOperations: PendingOperation[];
  isDirty: boolean;
  isCommitting: boolean;
};

type EditSessionAction =
  | { type: 'ADD_OPERATION'; payload: PendingOperation }
  | { type: 'REMOVE_OPERATION'; payload: string } // Remove by operation id
  | { type: 'UPDATE_OPERATION'; payload: { id: string; data: any } }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_COMMITTING'; payload: boolean }
  | { type: 'REVERT_OPERATION'; payload: string }; // Revert operation by id

const initialState: EditSessionState = {
  pendingOperations: [],
  isDirty: false,
  isCommitting: false,
};

function editSessionReducer(state: EditSessionState, action: EditSessionAction): EditSessionState {
  switch (action.type) {
    case 'ADD_OPERATION': {
      const existingIndex = state.pendingOperations.findIndex(op => 
        op.id === action.payload.id && op.type === action.payload.type
      );
      
      let newOperations;
      if (existingIndex !== -1) {
        // Update existing operation
        newOperations = [...state.pendingOperations];
        newOperations[existingIndex] = action.payload;
      } else {
        // Add new operation
        newOperations = [...state.pendingOperations, action.payload];
      }
      
      return {
        ...state,
        pendingOperations: newOperations,
        isDirty: newOperations.length > 0,
      };
    }
    
    case 'REMOVE_OPERATION': {
      const newOperations = state.pendingOperations.filter(op => op.id !== action.payload);
      return {
        ...state,
        pendingOperations: newOperations,
        isDirty: newOperations.length > 0,
      };
    }
    
    case 'UPDATE_OPERATION': {
      const newOperations = state.pendingOperations.map(op =>
        op.id === action.payload.id
          ? { ...op, data: action.payload.data, timestamp: new Date().toISOString() }
          : op
      );
      return {
        ...state,
        pendingOperations: newOperations,
        isDirty: newOperations.length > 0,
      };
    }
    
    case 'CLEAR_ALL': {
      return {
        ...state,
        pendingOperations: [],
        isDirty: false,
        isCommitting: false,
      };
    }
    
    case 'SET_COMMITTING': {
      return {
        ...state,
        isCommitting: action.payload,
      };
    }
    
    case 'REVERT_OPERATION': {
      const newOperations = state.pendingOperations.filter(op => op.id !== action.payload);
      return {
        ...state,
        pendingOperations: newOperations,
        isDirty: newOperations.length > 0,
      };
    }
    
    default:
      return state;
  }
}

type EditSessionContextType = {
  state: EditSessionState;
  addOperation: (operation: Omit<PendingOperation, 'timestamp'>) => void;
  removeOperation: (id: string) => void;
  updateOperation: (id: string, data: any) => void;
  revertOperation: (id: string) => void;
  clearAll: () => void;
  setCommitting: (committing: boolean) => void;
  getPendingChangesForItem: (itemId: string, itemType: string) => PendingOperation | undefined;
  hasPendingChanges: (itemId: string, itemType: string) => boolean;
  getPendingOperations: () => PendingOperation[];
};

const EditSessionContext = createContext<EditSessionContextType | null>(null);

export function EditSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editSessionReducer, initialState);

  const addOperation = (operation: Omit<PendingOperation, 'timestamp'>) => {
    dispatch({
      type: 'ADD_OPERATION',
      payload: {
        ...operation,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const removeOperation = (id: string) => {
    dispatch({ type: 'REMOVE_OPERATION', payload: id });
  };

  const updateOperation = (id: string, data: any) => {
    dispatch({ type: 'UPDATE_OPERATION', payload: { id, data } });
  };

  const revertOperation = (id: string) => {
    dispatch({ type: 'REVERT_OPERATION', payload: id });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  const setCommitting = (committing: boolean) => {
    dispatch({ type: 'SET_COMMITTING', payload: committing });
  };

  const getPendingChangesForItem = (itemId: string, itemType: string): PendingOperation | undefined => {
    return state.pendingOperations.find(op => 
      op.id === itemId && op.type.includes(itemType)
    );
  };

  const hasPendingChanges = (itemId: string, itemType: string): boolean => {
    return state.pendingOperations.some(op => 
      op.id === itemId && op.type.includes(itemType)
    );
  };

  const getPendingOperations = (): PendingOperation[] => {
    return state.pendingOperations;
  };

  const value: EditSessionContextType = {
    state,
    addOperation,
    removeOperation,
    updateOperation,
    revertOperation,
    clearAll,
    setCommitting,
    getPendingChangesForItem,
    hasPendingChanges,
    getPendingOperations,
  };

  return (
    <EditSessionContext.Provider value={value}>
      {children}
    </EditSessionContext.Provider>
  );
}

export function useEditSession() {
  const context = useContext(EditSessionContext);
  if (!context) {
    throw new Error('useEditSession must be used within an EditSessionProvider');
  }
  return context;
}

// Helper function to create batch operations from pending operations
export function createBatchOperationsFromPending(pendingOps: PendingOperation[]) {
  return pendingOps.map(op => ({
    type: op.type,
    id: op.id,
    data: op.data,
  }));
}