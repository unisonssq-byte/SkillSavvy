import { useState, useRef } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Plus, Save, X, Trash2, Copy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ContextMenu, { useContextMenu } from "@/components/ContextMenu";
import type { Block, Media } from "@shared/schema";

interface ContentBlockProps {
  block: Block;
  index: number;
  isAdmin: boolean;
}

export default function ContentBlock({ block, index, isAdmin }: ContentBlockProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editContent, setEditContent] = useState(block.content);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rightMediaInputRef = useRef<HTMLInputElement>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const [rightSideMedia, setRightSideMedia] = useState<Media[]>([]);

  // Fetch media for this block
  const { data: media = [] } = useQuery<Media[]>({
    queryKey: ["/api/blocks", block.id, "media"],
  });

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

  const handleSave = () => {
    updateBlockMutation.mutate({
      content: editContent,
    });
  };

  const handleCancel = () => {
    setEditContent(block.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteBlockMutation.mutate();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMediaMutation.mutate(file);
    }
  };

  const handleCopyBlock = async () => {
    try {
      const textContent = block.content && typeof block.content === 'object' && 'text' in block.content
        ? (block.content as any).text 
        : JSON.stringify(block.content || "");
      await navigator.clipboard.writeText(textContent);
      toast({
        title: "Скопировано",
        description: "Содержимое блока скопировано в буфер обмена.",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать содержимое.",
        variant: "destructive",
      });
    }
  };

  const handleBlockContextMenu = (e: React.MouseEvent) => {
    if (isAdmin) {
      showContextMenu(e);
    }
  };

  const handleRightMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMediaMutation.mutate(file);
    }
  };

  const handleMediaDragStart = (e: React.DragEvent, mediaId: string) => {
    setDraggedMediaId(mediaId);
    e.dataTransfer.setData('text/plain', mediaId);
  };

  const handleMediaDragEnd = () => {
    setDraggedMediaId(null);
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Здесь будет логика для изменения позиции медиа
  };

  const renderContent = () => {
    const content = isEditing ? editContent : block.content;
    
    if (block.type === "text") {
      return isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={(content as any)?.title || ""}
              onChange={(e) => setEditContent({ ...(content as any), title: e.target.value })}
              className="mt-1"
              data-testid="input-block-title"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              value={(content as any)?.text || ""}
              onChange={(e) => setEditContent({ ...(content as any), text: e.target.value })}
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

  const renderMedia = () => {
    if (media.length === 0) return null;

    return (
      <div className="relative">
        <div className="grid gap-4">
          {media.map((item) => (
            <div key={item.id} className="relative">
              {item.mimetype.startsWith('image/') ? (
                <img
                  src={item.url}
                  alt={item.originalName}
                  className="rounded-lg max-w-full h-auto"
                  data-testid={`img-media-${item.id}`}
                />
              ) : item.mimetype.startsWith('video/') ? (
                <video
                  src={item.url}
                  controls
                  className="rounded-lg max-w-full h-auto"
                  data-testid={`video-media-${item.id}`}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{item.originalName}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="relative group block-hover" 
      data-testid={`block-${block.id}`}
      onContextMenu={handleBlockContextMenu}
    >
      {/* Edit Handle (Admin Only) */}
      {isAdmin && !isEditing && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute -top-2 -left-2 w-8 h-8 edit-handle"
          onClick={() => setIsEditing(true)}
          data-testid="button-edit-block"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      )}
      
      <div className="bg-card rounded-lg p-8 hover-lift relative overflow-hidden">
        {block.type === "text" && (
          <div className="flex items-start space-x-8">
            <div className="flex-1">
              {renderContent()}
            </div>
            
            {/* Media Area */}
            <div className="relative">
              {renderMedia()}
              
              {/* Add Media Button */}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-4 -right-2 w-8 h-8 add-media-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMediaMutation.isPending}
                  data-testid="button-add-media"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />
            </div>
          </div>
        )}
        
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
              Are you sure you want to delete this block? This action cannot be undone.
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
            label: "Редактировать",
            onClick: () => setIsEditing(true),
          },
          {
            icon: <Copy className="w-4 h-4" />,
            label: "Копировать текст",
            onClick: handleCopyBlock,
          },
          {
            icon: <Trash2 className="w-4 h-4" />,
            label: "Удалить блок",
            variant: "destructive",
            onClick: () => setShowDeleteDialog(true),
          },
        ]}
      />
    </div>
  );
}
