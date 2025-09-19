import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import ContentBlock from "@/components/ContentBlock";
import AdminAuthModal from "@/components/AdminAuthModal";
import MediaUploadModal from "@/components/MediaUploadModal";
import AdminPanel from "@/components/AdminPanel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Page, Block } from "@shared/schema";

export default function Portfolio() {
  const { pageSlug } = useParams();
  const { isAdmin } = useAdmin();
  const [currentPageId, setCurrentPageId] = useState<string>("");
  const [showAddBlock, setShowAddBlock] = useState(false);

  // Initialize WebSocket connection
  useWebSocket();

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

  const currentPage = pages.find(p => p.id === currentPageId);

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
            {blocks.map((block, index) => (
              <ContentBlock
                key={block.id}
                block={block}
                index={index}
                isAdmin={isAdmin}
              />
            ))}

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

      {/* Admin Components */}
      <AdminAuthModal />
      <MediaUploadModal isOpen={false} onClose={() => {}} />
      {isAdmin && <AdminPanel />}
    </div>
  );
}
