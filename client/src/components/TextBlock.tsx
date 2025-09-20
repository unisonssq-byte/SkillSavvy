import { useState, useRef } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Save, X, Trash2, Copy, Plus, Move } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ContextMenu, { useContextMenu } from "@/components/ContextMenu";
import { PendingChangesIndicator } from "@/components/PendingChangesIndicator";
import { useEditSessionForm } from "@/hooks/useEditSessionForm";
import type { Block, Media } from "@shared/schema";

interface TextBlockProps {
  block: Block;
  index: number;
  isAdmin: boolean;
}

export default function TextBlock({ block, index, isAdmin }: TextBlockProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const bottomMediaInputRef = useRef<HTMLInputElement>(null);
  const rightMediaInputRef = useRef<HTMLInputElement>(null);

  // Fetch media for this block
  const { data: allMedia = [] } = useQuery<Media[]>({
    queryKey: ["/api/blocks", block.id, "media"],
  });

  // Separate media by position
  const bottomMedia = allMedia.filter((m: Media) => m.position === "bottom");
  const rightMedia = allMedia.filter((m: Media) => m.position === "right");

  // Use edit session form for pending changes tracking
  const {
    formData: editContent,
    updateFormData,
    revertChanges,
    hasUnsavedChanges,
    hasPendingChanges,
  } = useEditSessionForm(block.id, 'block', block.content as Record<string, any>, 'update');

  const updateBlockMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/blocks/${block.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", block.pageId, "blocks"] });
      setIsEditing(false);
      toast({
        title: "Block updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update block. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/blocks/${block.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", block.pageId, "blocks"] });
      toast({
        title: "Block deleted",
        description: "The block has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete block. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async ({ file, position, width }: { file: File, position: "bottom" | "right", width?: number }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('blockId', block.id);
      formData.append('position', position);
      if (width) {
        formData.append('width', width.toString());
      }
      
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

  const handleSave = () => {
    updateBlockMutation.mutate({
      content: editContent,
    });
  };

  const handleCancel = () => {
    revertChanges();
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteBlockMutation.mutate();
  };

  const handleCopyBlock = async () => {
    try {
      const textContent = block.content && typeof block.content === 'object' && 'text' in block.content
        ? (block.content as any).text 
        : JSON.stringify(block.content || "");
      await navigator.clipboard.writeText(textContent);
      toast({
        title: "Copied",
        description: "Block content copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content.",
        variant: "destructive",
      });
    }
  };

  const handleBlockContextMenu = (e: React.MouseEvent) => {
    if (isAdmin) {
      showContextMenu(e);
    }
  };

  const handleBottomMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMediaMutation.mutate({ file, position: "bottom" });
    }
  };

  const handleRightMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMediaMutation.mutate({ file, position: "right", width: 300 });
    }
  };

  const handleDeleteMedia = (mediaId: string) => {
    deleteMediaMutation.mutate(mediaId);
  };

  const updateMediaWidth = async (mediaId: string, newWidth: number) => {
    try {
      await apiRequest("PUT", `/api/media/${mediaId}`, { width: newWidth });
      queryClient.invalidateQueries({ queryKey: ["/api/blocks", block.id, "media"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update media width.",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    const content = isEditing ? editContent : block.content;
    
    if (block.type === "text" || block.type === "text_media") {
      return isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={(content as any)?.title || ""}
              onChange={(e) => updateFormData({ ...(content as any), title: e.target.value })}
              className="mt-1"
              data-testid="input-block-title"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              value={(content as any)?.text || ""}
              onChange={(e) => updateFormData({ ...(content as any), text: e.target.value })}
              rows={6}
              className="mt-1"
              data-testid="textarea-block-content"
            />
          </div>
        </div>
      ) : (
        <div>
          {(content as any).title && (
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {(content as any).title}
            </h2>
          )}
          {(content as any).text && (
            <p className="text-lg text-card-foreground leading-relaxed whitespace-pre-wrap">
              {(content as any).text}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  const renderRightMedia = () => {
    if (rightMedia.length === 0) return null;

    return (
      <div className="space-y-4">
        {rightMedia.map((item) => (
          <div key={item.id} className="relative group">
            <div 
              className="resize-x overflow-hidden min-w-[100px] max-w-[800px] border-2 border-dashed border-gray-300 rounded-lg"
              style={{ width: `${item.width || 300}px` }}
            >
              {item.mimetype.startsWith('image/') ? (
                <img
                  src={item.url}
                  alt={item.originalName}
                  className="w-full h-auto rounded-lg"
                  data-testid={`img-right-media-${item.id}`}
                />
              ) : item.mimetype.startsWith('video/') ? (
                <video
                  src={item.url}
                  controls
                  className="w-full h-auto rounded-lg"
                  data-testid={`video-right-media-${item.id}`}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{item.originalName}</p>
                </div>
              )}
            </div>
            
            {/* Media Controls */}
            {isAdmin && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-8 h-8 p-0"
                  onClick={() => handleDeleteMedia(item.id)}
                  data-testid={`button-delete-right-media-${item.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderBottomMedia = () => {
    if (bottomMedia.length === 0) return null;

    return (
      <div className="space-y-4 mt-6">
        {bottomMedia.map((item) => (
          <div key={item.id} className="relative group">
            {item.mimetype.startsWith('image/') ? (
              <img
                src={item.url}
                alt={item.originalName}
                className="w-full h-auto rounded-lg"
                data-testid={`img-bottom-media-${item.id}`}
              />
            ) : item.mimetype.startsWith('video/') ? (
              <video
                src={item.url}
                controls
                className="w-full h-auto rounded-lg"
                data-testid={`video-bottom-media-${item.id}`}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{item.originalName}</p>
              </div>
            )}
            
            {/* Media Controls */}
            {isAdmin && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-8 h-8 p-0"
                  onClick={() => handleDeleteMedia(item.id)}
                  data-testid={`button-delete-bottom-media-${item.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      className="relative group block-hover" 
      data-testid={`text-block-${block.id}`}
      onContextMenu={handleBlockContextMenu}
    >
      {/* Edit Handle (Admin Only) */}
      {isAdmin && !isEditing && (
        <div className="absolute -top-2 -left-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="w-8 h-8 edit-handle"
            onClick={() => setIsEditing(true)}
            data-testid="button-edit-text-block"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <PendingChangesIndicator
            itemId={block.id}
            itemType="block"
            showRevertButton={true}
          />
        </div>
      )}
      
      <div className="bg-card rounded-lg p-8 hover-lift relative overflow-hidden">
        {!isEditing ? (
          <>
            {/* Content and Right Media Layout */}
            <div className="flex gap-8 items-start">
              {/* Main Text Content */}
              <div 
                className="flex-1 relative"
                style={{ 
                  maxWidth: rightMedia.length > 0 
                    ? `calc(100% - ${Math.max(...rightMedia.map(m => m.width || 300)) + 100}px)` 
                    : '100%' 
                }}
              >
                {renderContent()}
                
                {/* Bottom Media Add Button */}
                {isAdmin && (
                  <div className="relative mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-8 h-8 p-0 border-dashed border-2"
                      onClick={() => bottomMediaInputRef.current?.click()}
                      disabled={uploadMediaMutation.isPending}
                      data-testid="button-add-bottom-media"
                      title="Add image below"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Right Media Column */}
              <div className="relative">
                {renderRightMedia()}
                
                {/* Right Media Add Button */}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-8 h-8 p-0 border-dashed border-2 mt-2"
                    onClick={() => rightMediaInputRef.current?.click()}
                    disabled={uploadMediaMutation.isPending}
                    data-testid="button-add-right-media"
                    title="Add image to the right"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Bottom Media - Full Width */}
            {renderBottomMedia()}
          </>
        ) : (
          /* Edit Mode */
          renderContent()
        )}
        
        {/* Hidden File Inputs */}
        <input
          ref={bottomMediaInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleBottomMediaUpload}
          className="hidden"
          data-testid="input-bottom-media-upload"
        />
        <input
          ref={rightMediaInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleRightMediaUpload}
          className="hidden"
          data-testid="input-right-media-upload"
        />
        
        {/* Edit Mode Controls */}
        {isEditing && (
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateBlockMutation.isPending}
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={updateBlockMutation.isPending || deleteBlockMutation.isPending}
              data-testid="button-delete-block"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateBlockMutation.isPending}
              data-testid="button-save-block"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateBlockMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Block</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this text block? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isVisible={contextMenu.isVisible}
        onClose={hideContextMenu}
        options={[
          {
            icon: <Edit2 className="w-4 h-4" />,
            label: "Edit",
            onClick: () => setIsEditing(true),
          },
          {
            icon: <Copy className="w-4 h-4" />,
            label: "Copy text",
            onClick: handleCopyBlock,
          },
          {
            icon: <Trash2 className="w-4 h-4" />,
            label: "Delete block",
            variant: "destructive",
            onClick: () => setShowDeleteDialog(true),
          },
        ]}
      />
    </div>
  );
}