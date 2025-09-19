import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditSession, createBatchOperationsFromPending } from '@/contexts/EditSessionContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AdminSaveButton() {
  const editSession = useEditSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { state } = editSession;
  const { isDirty, pendingOperations, isCommitting } = state;

  // Mutation for batch save operation
  const saveAllMutation = useMutation({
    mutationFn: async (operations: any[]) => {
      const response = await apiRequest('POST', '/api/batch', { operations });
      return response.json();
    },
    onMutate: () => {
      // Set committing state
      editSession.setCommitting(true);
    },
    onSuccess: (result) => {
      // Clear all pending operations
      editSession.clearAll();
      
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      
      // Success toast
      toast({
        title: 'Changes saved',
        description: `Successfully saved ${result.results?.length || pendingOperations.length} changes.`,
      });
    },
    onError: (error: any) => {
      // Reset committing state
      editSession.setCommitting(false);
      
      // Error toast
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always reset committing state on completion
      editSession.setCommitting(false);
    },
  });

  // Handler for save button click
  const handleSave = () => {
    if (!isDirty || isCommitting || pendingOperations.length === 0) {
      return;
    }

    // Convert pending operations to batch format
    const batchOperations = createBatchOperationsFromPending(pendingOperations);
    
    // Execute save mutation
    saveAllMutation.mutate(batchOperations);
  };

  // Don't render if no pending changes
  if (!isDirty || pendingOperations.length === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="default"
          className="w-auto h-10 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          onClick={handleSave}
          disabled={isCommitting || saveAllMutation.isPending}
          data-testid="button-admin-save"
        >
          {isCommitting || saveAllMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save ({pendingOperations.length})
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p>Save all pending changes</p>
          <p className="text-xs text-muted-foreground">
            {pendingOperations.length} operation{pendingOperations.length !== 1 ? 's' : ''} pending
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default AdminSaveButton;