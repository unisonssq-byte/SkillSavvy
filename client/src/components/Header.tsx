import { useState } from "react";
import { Link, useParams } from "wouter";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, User, Settings } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Page } from "@shared/schema";

interface HeaderProps {
  pages: Page[];
  currentPageId: string;
}

export default function Header({ pages, currentPageId }: HeaderProps) {
  const { pageSlug } = useParams();
  const { isAdmin, openAdminModal } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");

  const createPageMutation = useMutation({
    mutationFn: async (data: { title: string; slug: string }) => {
      const response = await apiRequest("POST", "/api/pages", data);
      return response.json();
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setShowAddPage(false);
      setNewPageTitle("");
      toast({
        title: "Page created",
        description: `"${newPage.title}" has been created successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePage = () => {
    if (!newPageTitle.trim()) return;
    
    const slug = newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    createPageMutation.mutate({
      title: newPageTitle.trim(),
      slug,
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-effect" data-testid="header">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-lg animate-float">
              U
            </div>
            <h1 className="text-xl font-semibold">Unicode's Portfolio</h1>
          </Link>
          
          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-2" data-testid="nav-tabs">
            <div className="flex bg-muted rounded-lg p-1">
              {pages.map((page) => (
                <Link 
                  key={page.id}
                  href={page.slug === 'home' ? '/' : `/${page.slug}`}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    page.id === currentPageId || (page.slug === 'home' && !pageSlug)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`nav-tab-${page.slug}`}
                >
                  {page.title}
                </Link>
              ))}
            </div>
            
            {/* Add Page Button (Admin Only) */}
            {isAdmin && (
              <Dialog open={showAddPage} onOpenChange={setShowAddPage}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="w-8 h-8 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80"
                    data-testid="button-add-page"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Page</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Page Title</label>
                      <Input
                        value={newPageTitle}
                        onChange={(e) => setNewPageTitle(e.target.value)}
                        placeholder="Enter page title"
                        className="mt-1"
                        data-testid="input-page-title"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleCreatePage}
                        disabled={!newPageTitle.trim() || createPageMutation.isPending}
                        className="flex-1"
                        data-testid="button-create-page"
                      >
                        {createPageMutation.isPending ? "Creating..." : "Create Page"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddPage(false)}
                        className="flex-1"
                        data-testid="button-cancel-page"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </nav>
          
          {/* Admin Button */}
          <Button
            size="sm"
            variant="secondary"
            className="w-10 h-10 rounded-lg"
            onClick={() => {
              console.log('Admin button clicked!');
              openAdminModal();
            }}
            data-testid="button-admin"
          >
            {isAdmin ? <Settings className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
