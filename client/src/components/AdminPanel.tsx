import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { LogOut, Wifi } from "lucide-react";

export default function AdminPanel() {
  const { logout } = useAdmin();

  return (
    <div className="fixed bottom-6 right-6 z-30" data-testid="admin-panel">
      <div className="bg-card rounded-lg p-4 shadow-2xl glass-effect slide-in">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
          <Wifi className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Admin Mode</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={logout}
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
