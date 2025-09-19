import { useState } from "react";
import { Link, useParams } from "wouter";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, User, Settings, Edit2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ContextMenu, { useContextMenu } from "@/components/ContextMenu";
import AdminSaveButton from "@/components/AdminSaveButton";
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
  const [showEditPage, setShowEditPage] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [editPageTitle, setEditPageTitle] = useState("");
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

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

  const updatePageMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; slug: string }) => {
      const response = await apiRequest("PUT", `/api/pages/${data.id}`, { title: data.title, slug: data.slug });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setShowEditPage(false);
      setEditingPage(null);
      setEditPageTitle("");
      toast({
        title: "Page updated",
        description: "Page has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      await apiRequest("DELETE", `/api/pages/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({
        title: "Page deleted",
        description: "Page has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete page. Please try again.",
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

  const handleUpdatePage = () => {
    if (!editPageTitle.trim() || !editingPage) return;
    
    const slug = editPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    updatePageMutation.mutate({
      id: editingPage.id,
      title: editPageTitle.trim(),
      slug,
    });
  };

  const showPageContextMenu = (e: React.MouseEvent, page: Page) => {
    showContextMenu(e);
    setEditingPage(page);
    setEditPageTitle(page.title);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-effect" data-testid="header">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-lg animate-float">
                U
              </div>
              <h1 className="text-xl font-semibold animate-float-sync">Unicode's Portfolio</h1>
            </Link>
            
            {/* Navigation Tabs - Centered */}
            <nav className="flex-1 flex justify-center" data-testid="nav-tabs">
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
                    onContextMenu={(e) => {
                      if (isAdmin) {
                        showPageContextMenu(e, page);
                      }
                    }}
                  >
                    {page.title}
                  </Link>
                ))}
                
                {/* Add Page Button (Admin Only) */}
                {isAdmin && (
                  <Dialog open={showAddPage} onOpenChange={setShowAddPage}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="w-8 h-8 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 ml-2"
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
              </div>
            </nav>
            
            {/* Admin Controls */}
            <div className="flex items-center gap-2">
              {/* Admin Save Button - only shows when admin and has pending changes */}
              {isAdmin && <AdminSaveButton />}
              
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
        </div>
      </div>
      
      {/* Page Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isVisible={contextMenu.isVisible}
        onClose={hideContextMenu}
        options={[
          {
            icon: <Edit2 className="w-4 h-4" />,
            label: "Переименовать",
            onClick: () => setShowEditPage(true),
          },
          {
            icon: <Trash2 className="w-4 h-4" />,
            label: "Удалить",
            variant: "destructive",
            onClick: () => {
              if (editingPage && confirm(`Вы уверены, что хотите удалить страницу "${editingPage.title}"?`)) {
                deletePageMutation.mutate(editingPage.id);
              }
            },
          },
        ]}
      />

      {/* Edit Page Modal */}
      <Dialog open={showEditPage} onOpenChange={setShowEditPage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить название страницы</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Название страницы</label>
              <Input
                value={editPageTitle}
                onChange={(e) => setEditPageTitle(e.target.value)}
                placeholder="Введите название страницы"
                className="mt-1"
                data-testid="input-edit-page-title"
              />
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleUpdatePage}
                disabled={!editPageTitle.trim() || updatePageMutation.isPending}
                className="flex-1"
                data-testid="button-update-page"
              >
                {updatePageMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditPage(false)}
                className="flex-1"
                data-testid="button-cancel-edit-page"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
