import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminAuthModal() {
  const { isAdminModalOpen, closeAdminModal, login } = useAdmin();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        login(data.token);
        closeAdminModal();
        setPassword("");
        toast({
          title: "Admin access granted",
          description: "You are now in admin mode.",
        });
      } else {
        toast({
          title: "Неправильный пароль",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    closeAdminModal();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Dialog open={isAdminModalOpen} onOpenChange={handleClose}>
      <DialogContent className="slide-in" data-testid="modal-admin-auth">
        <DialogHeader>
          <DialogTitle className="text-center">Admin Access</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full"
            data-testid="input-admin-password"
          />
          <div className="flex space-x-3">
            <Button
              onClick={handleLogin}
              disabled={!password.trim() || isLoading}
              className="flex-1"
              data-testid="button-admin-login"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
              data-testid="button-admin-cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
