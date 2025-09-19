import { useState, useRef } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Move, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ContextMenu, { useContextMenu } from "@/components/ContextMenu";
import { PendingChangesIndicator } from "@/components/PendingChangesIndicator";
import type { Block, Media } from "@shared/schema";

interface RightMediaSubstrateProps {
  block: Block;
  index: number;
  isAdmin: boolean;
  allMediaBlocks?: Block[];
  onBlockChange?: (blockId: string) => void;
}

export default function RightMediaSubstrate({ block, index, isAdmin, allMediaBlocks = [], onBlockChange }: RightMediaSubstrateProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  // Fetch media for this block
  const { data: media = [] } = useQuery<Media[]>({
    queryKey: ["/api/blocks", block.id, "media"],
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('blockId', block.id);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks", block.id, "media"] });
      toast({
        title: "Media uploaded",
        description: "Your file has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload media. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await apiRequest("DELETE", `/api/media/${mediaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks", block.id, "media"] });
      toast({
        title: "Media deleted",
        description: "The media has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete media. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMediaMutation.mutate(file);
    }
  };

  const handleDeleteMedia = (media: Media) => {
    setMediaToDelete(media);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMedia = () => {
    if (mediaToDelete) {
      deleteMediaMutation.mutate(mediaToDelete.id);
      setMediaToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleMediaDragStart = (e: React.DragEvent, mediaId: string) => {
    setDraggedMediaId(mediaId);
    e.dataTransfer.setData('text/plain', mediaId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMediaDragEnd = () => {
    setDraggedMediaId(null);
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Future implementation for media reordering
  };

  const handleMediaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleMediaContextMenu = (e: React.MouseEvent, media: Media) => {
    if (isAdmin) {
      showContextMenu(e);
      setMediaToDelete(media);
    }
  };

  // Navigation between media blocks
  const currentBlockIndex = allMediaBlocks.findIndex(b => b.id === block.id);
  const isValidIndex = currentBlockIndex >= 0;
  const hasPrevious = isValidIndex && currentBlockIndex > 0;
  const hasNext = isValidIndex && currentBlockIndex < allMediaBlocks.length - 1;

  const handlePreviousBlock = () => {
    if (hasPrevious && onBlockChange) {
      onBlockChange(allMediaBlocks[currentBlockIndex - 1].id);
    }
  };

  const handleNextBlock = () => {
    if (hasNext && onBlockChange) {
      onBlockChange(allMediaBlocks[currentBlockIndex + 1].id);
    }
  };

  const renderMediaItem = (item: Media) => {
    const isDragging = draggedMediaId === item.id;
    
    return (
      <div 
        key={item.id} 
        className={`relative group bg-card rounded-lg p-4 border hover-lift ${isDragging ? 'opacity-50' : ''}`}
        draggable={isAdmin}
        onDragStart={(e) => handleMediaDragStart(e, item.id)}
        onDragEnd={handleMediaDragEnd}
        onDrop={handleMediaDrop}
        onDragOver={handleMediaDragOver}
        onContextMenu={(e) => handleMediaContextMenu(e, item)}
        data-testid={`media-item-${item.id}`}
      >
        {/* Media Content */}
        <div className="media-content">
          {item.mimetype.startsWith('image/') ? (
            <img
              src={item.url}
              alt={item.originalName}
              className="rounded-lg max-w-full h-auto max-h-64 object-cover"
              data-testid={`img-media-${item.id}`}
            />
          ) : item.mimetype.startsWith('video/') ? (
            <video
              src={item.url}
              controls
              className="rounded-lg max-w-full h-auto max-h-64"
              data-testid={`video-media-${item.id}`}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">{item.originalName}</p>
              <p className="text-xs text-muted-foreground">{item.mimetype}</p>
            </div>
          )}
        </div>

        {/* Media Controls (Admin Only) */}
        {isAdmin && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="w-6 h-6 p-0"
              title="Drag to reorder"
              data-testid={`button-move-media-${item.id}`}
            >
              <Move className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="w-6 h-6 p-0"
              onClick={() => handleDeleteMedia(item)}
              title="Delete media"
              data-testid={`button-delete-media-${item.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* File name overlay */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
            {item.originalName}
          </div>
        </div>
      </div>
    );
  };

  // Always render substrate when there are media blocks available for navigation
  // The component will show empty state if no media, but navigation remains accessible

  return (
    <div 
      className="fixed right-6 top-24 bottom-6 w-80 z-20 media-substrate"
      data-testid={`media-substrate-${block.id}`}
    >
      <div className="h-full bg-card/95 backdrop-blur-sm rounded-lg border shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">Media Gallery</h3>
              {allMediaBlocks.length > 1 && isValidIndex && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0"
                    onClick={handlePreviousBlock}
                    disabled={!hasPrevious}
                    title="Previous block"
                    data-testid="button-previous-media-block"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentBlockIndex + 1}/{allMediaBlocks.length}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0"
                    onClick={handleNextBlock}
                    disabled={!hasNext}
                    title="Next block"
                    data-testid="button-next-media-block"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <PendingChangesIndicator
                itemId={block.id}
                itemType="block"
                className="scale-75"
              />
              {isAdmin && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-8 h-8 p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMediaMutation.isPending}
                  title="Add media"
                  data-testid="button-add-media"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {media.length > 0 ? (
            <div className="space-y-4">
              {media.map(renderMediaItem)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="text-muted-foreground text-sm">
                No media files
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMediaMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add first media
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
          data-testid="input-file-upload"
        />
      </div>

      {/* Delete Media Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{mediaToDelete?.originalName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-media">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMedia}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-media"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Media Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isVisible={contextMenu.isVisible}
        onClose={hideContextMenu}
        options={[
          {
            icon: <Trash2 className="w-4 h-4" />,
            label: "Delete media",
            variant: "destructive",
            onClick: () => {
              if (mediaToDelete) {
                setShowDeleteDialog(true);
              }
            },
          },
        ]}
      />
    </div>
  );
}