import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Copy, Trash2, FileText } from "lucide-react";

interface ContextMenuOption {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  options: ContextMenuOption[];
  isVisible: boolean;
}

export default function ContextMenu({ x, y, onClose, options, isVisible }: ContextMenuProps) {
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('contextmenu', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const menuStyle = {
    position: 'fixed' as const,
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - options.length * 44),
    zIndex: 9999,
  };

  return (
    <div 
      className="context-menu-backdrop fixed inset-0 z-[9998]"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        style={menuStyle}
        className="bg-popover border border-border rounded-lg shadow-lg py-2 min-w-[180px] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        data-testid="context-menu"
      >
        {options.map((option, index) => (
          <button
            key={index}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 ${
              option.variant === 'destructive' ? 'text-destructive hover:bg-destructive hover:text-destructive-foreground' : ''
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              option.onClick();
              onClose();
            }}
            data-testid={`context-menu-option-${index}`}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    isVisible: boolean;
  }>({
    x: 0,
    y: 0,
    isVisible: false,
  });

  const showContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isVisible: true,
    });
  };

  const hideContextMenu = () => {
    setContextMenu(prev => ({
      ...prev,
      isVisible: false,
    }));
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}