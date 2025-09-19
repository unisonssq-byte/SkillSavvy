import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import TextBlock from "@/components/TextBlock";
import RightMediaSubstrate from "@/components/RightMediaSubstrate";
import AdminAuthModal from "@/components/AdminAuthModal";
import MediaUploadModal from "@/components/MediaUploadModal";
import AdminPanel from "@/components/AdminPanel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Page, Block } from "@shared/schema";

export default function Portfolio() {
  const { pageSlug } = useParams();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPageId, setCurrentPageId] = useState<string>("");
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockType, setNewBlockType] = useState<string>("text");
  const [newBlockContent, setNewBlockContent] = useState<string>("");
  const [activeMediaBlockId, setActiveMediaBlockId] = useState<string | null>(null);

  // Initialize WebSocket connection
  useWebSocket();

  // Mutation for creating new block
  const createBlockMutation = useMutation({
    mutationFn: async (blockData: { pageId: string; type: string; content: any }) => {
      const response = await apiRequest("POST", "/api/blocks", blockData);
      return response.json();
    },
    onSuccess: (newBlock) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", currentPageId, "blocks"] });
      setShowAddBlock(false);
      setNewBlockType("text");
      setNewBlockContent("");
      toast({
        title: "Block created",
        description: "New content block has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create block. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch pages
  const { data: pages = [], isLoading: pagesLoading } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
  });

  // Fetch blocks for current page
  const { data: blocks = [], isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/pages", currentPageId, "blocks"],
    enabled: !!currentPageId,
  });

  // Set current page based on slug or default to first page
  useEffect(() => {
    if (pages.length > 0) {
      if (pageSlug) {
        const page = pages.find(p => p.slug === pageSlug);
        if (page) {
          setCurrentPageId(page.id);
        }
      } else {
        // Default to first page
        setCurrentPageId(pages[0].id);
      }
    }
  }, [pages, pageSlug]);

  // Manage active media block state
  useEffect(() => {
    const mediaBlocks = blocks.filter(block => block.type === 'media' || block.type === 'text_media');
    
    if (mediaBlocks.length === 0) {
      // No media blocks, clear active state
      setActiveMediaBlockId(null);
    } else if (!activeMediaBlockId || !mediaBlocks.find(block => block.id === activeMediaBlockId)) {
      // No active block or current active block is stale, set to first available
      setActiveMediaBlockId(mediaBlocks[0].id);
    }
  }, [blocks, activeMediaBlockId]);

  // Reset active media block when page changes
  useEffect(() => {
    setActiveMediaBlockId(null);
  }, [currentPageId]);

  const currentPage = pages.find(p => p.id === currentPageId);

  const handleCreateBlock = () => {
    if (!newBlockContent.trim() || !currentPageId) return;
    
    const content = newBlockType === "text" 
      ? { text: newBlockContent.trim() }
      : { text: newBlockContent.trim() };

    createBlockMutation.mutate({
      pageId: currentPageId,
      type: newBlockType,
      content,
    });
  };

  if (pagesLoading || blocksLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center font-bold text-2xl animate-float mx-auto">
            U
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <Header pages={pages} currentPageId={currentPageId} />

      {/* Main Content */}
      <main className="pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="space-y-8 fade-in">
            {blocks
              .filter(block => block.type === 'text' || block.type === 'text_media')
              .map((block, index) => (
                <TextBlock
                  key={block.id}
                  block={block}
                  index={index}
                  isAdmin={isAdmin}
                />
              ))
            }

            {/* Add New Block Button */}
            {isAdmin && (
              <div className="text-center">
                <Button
                  onClick={() => setShowAddBlock(true)}
                  variant="outline"
                  size="lg"
                  className="border-dashed border-2 h-32 w-full hover:bg-muted/80 transition-all group"
                  data-testid="button-add-block"
                >
                  <div className="text-center">
                    <Plus className="w-8 h-8 text-muted-foreground group-hover:text-foreground mb-2 mx-auto transition-colors" />
                    <p className="text-muted-foreground group-hover:text-foreground transition-colors">
                      Add New Block
                    </p>
                  </div>
                </Button>
              </div>
            )}

            {/* Empty state for non-admin users */}
            {!isAdmin && blocks.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="text-2xl">📄</div>
                </div>
                <h3 className="text-lg font-semibold mb-2">No content yet</h3>
                <p className="text-muted-foreground">
                  This page is empty. Content will appear here once it's added.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Single Right Media Substrate - shows media for active block */}
      {activeMediaBlockId && (() => {
        const mediaBlocks = blocks.filter(block => block.type === 'media' || block.type === 'text_media');
        const activeBlock = blocks.find(block => block.id === activeMediaBlockId);
        return activeBlock ? (
          <RightMediaSubstrate
            key={`media-${activeBlock.id}`}
            block={activeBlock}
            index={blocks.indexOf(activeBlock)}
            isAdmin={isAdmin}
            allMediaBlocks={mediaBlocks}
            onBlockChange={setActiveMediaBlockId}
          />
        ) : null;
      })()}

      {/* Admin Components */}
      <AdminAuthModal />
      <MediaUploadModal isOpen={false} onClose={() => {}} />
      {isAdmin && <AdminPanel />}

      {/* Add Block Modal */}
      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent className="slide-in" data-testid="modal-add-block">
          <DialogHeader>
            <DialogTitle>Add New Content Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Block Type</label>
              <Select value={newBlockType} onValueChange={setNewBlockType} data-testid="select-block-type">
                <SelectTrigger>
                  <SelectValue placeholder="Select block type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Block</SelectItem>
                  <SelectItem value="media">Media Block</SelectItem>
                  <SelectItem value="text_media">Text + Media Block</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Content</label>
              <Textarea
                value={newBlockContent}
                onChange={(e) => setNewBlockContent(e.target.value)}
                placeholder="Enter your content here..."
                className="min-h-[100px]"
                data-testid="textarea-block-content"
              />
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleCreateBlock}
                disabled={!newBlockContent.trim() || createBlockMutation.isPending}
                className="flex-1"
                data-testid="button-create-block"
              >
                {createBlockMutation.isPending ? "Creating..." : "Create Block"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddBlock(false)}
                className="flex-1"
                data-testid="button-cancel-block"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
