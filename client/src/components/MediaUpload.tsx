import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Media } from "@shared/schema";

interface MediaUploadProps {
  blockId: string;
  isEditing: boolean;
}

export default function MediaUpload({ blockId, isEditing }: MediaUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Query to fetch media for this block
  const { data: mediaItems = [], refetch } = useQuery({
    queryKey: ["media", blockId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/blocks/${blockId}/media`);
      return (await response.json()) as Media[];
    },
    enabled: !!blockId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("blockId", blockId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await apiRequest("DELETE", `/api/media/${mediaId}`);
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Media deleted",
        description: "The media item has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete media item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderMedia = (media: Media) => {
    const isVideo = media.mimetype.startsWith("video/");
    
    return (
      <div key={media.id} className="relative group">
        {isVideo ? (
          <div className="relative">
            <video
              src={media.url}
              poster={media.thumbnailUrl || undefined}
              className="w-full max-w-md rounded-lg"
              controls
            />
            <div className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1">
              <Play className="w-4 h-4 text-white" />
            </div>
          </div>
        ) : (
          <img
            src={media.url}
            alt={media.originalName}
            className="w-full max-w-md rounded-lg"
          />
        )}
        
        {isEditing && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => deleteMutation.mutate(media.id)}
            disabled={deleteMutation.isPending}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Display existing media */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mediaItems.map(renderMedia)}
        </div>
      )}

      {/* Upload controls (only in edit mode) */}
      {isEditing && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <Image className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Upload images or videos to add to this block
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: JPG, PNG, GIF, MP4, MOV, AVI, WebM, SVG
              </p>
            </div>
            
            <Button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="mb-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Choose File"}
            </Button>
            
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}