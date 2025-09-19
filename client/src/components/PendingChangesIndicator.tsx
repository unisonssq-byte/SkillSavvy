import React from 'react';
import { useEditSession } from '@/contexts/EditSessionContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PendingChangesIndicatorProps {
  itemId: string;
  itemType: string;
  showRevertButton?: boolean;
  className?: string;
}

export function PendingChangesIndicator({ 
  itemId, 
  itemType, 
  showRevertButton = false,
  className = '' 
}: PendingChangesIndicatorProps) {
  const editSession = useEditSession();
  
  const pendingOperation = editSession.getPendingChangesForItem(itemId, itemType);
  const hasPending = editSession.hasPendingChanges(itemId, itemType);

  if (!hasPending || !pendingOperation) {
    return null;
  }

  const handleRevert = () => {
    editSession.revertOperation(itemId);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Unsaved changes - will be committed on save</p>
          <p className="text-xs text-muted-foreground">
            Modified: {new Date(pendingOperation.timestamp).toLocaleTimeString()}
          </p>
        </TooltipContent>
      </Tooltip>
      
      {showRevertButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevert}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Revert changes</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Component to show overall dirty state and pending operation count
 */
export function EditSessionStatus({ className = '' }: { className?: string }) {
  const editSession = useEditSession();
  const { isDirty, pendingOperations, isCommitting } = editSession.state;

  if (!isDirty && !isCommitting) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isCommitting ? (
        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
          Saving...
        </Badge>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800">
              {pendingOperations.length} unsaved change{pendingOperations.length !== 1 ? 's' : ''}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>Pending operations:</p>
              {pendingOperations.slice(0, 5).map((op, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  • {op.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              ))}
              {pendingOperations.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  ...and {pendingOperations.length - 5} more
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}