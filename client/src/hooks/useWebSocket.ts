import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectCount = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        reconnectCount.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        // Attempt to reconnect with exponential backoff
        if (reconnectCount.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectCount.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCount.current += 1;
            console.log(`Attempting to reconnect... (${reconnectCount.current}/${maxReconnectAttempts})`);
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          toast({
            title: "Connection lost",
            description: "Unable to reconnect to the server. Please refresh the page.",
            variant: "destructive",
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    console.log('WebSocket message received:', data.type, data.payload);
    
    switch (data.type) {
      case "PAGE_CREATED":
        queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
        toast({
          title: "Page created",
          description: `New page "${data.payload.title}" has been added.`,
        });
        break;

      case "PAGE_UPDATED":
        queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
        toast({
          title: "Page updated",
          description: `Page "${data.payload.title}" has been modified.`,
        });
        break;

      case "PAGE_DELETED":
        queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
        toast({
          title: "Page deleted",
          description: "A page has been removed.",
        });
        break;

      case "BLOCK_CREATED":
        // Invalidate both the specific page blocks and general pages query
        queryClient.invalidateQueries({ 
          queryKey: ["/api/pages", data.payload.pageId, "blocks"] 
        });
        queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
        break;

      case "BLOCK_UPDATED":
        // Invalidate both the specific page blocks and general pages query
        queryClient.invalidateQueries({ 
          queryKey: ["/api/pages", data.payload.pageId, "blocks"] 
        });
        queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
        break;

      case "BLOCK_DELETED":
        // Invalidate all relevant queries when block is deleted
        queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
        if (data.payload.pageId) {
          queryClient.invalidateQueries({ 
            queryKey: ["/api/pages", data.payload.pageId, "blocks"] 
          });
        }
        break;

      case "MEDIA_UPLOADED":
      case "MEDIA_CREATED":
        // Handle both event types for consistency
        if (data.payload.blockId) {
          queryClient.invalidateQueries({ 
            queryKey: ["/api/blocks", data.payload.blockId, "media"] 
          });
        }
        break;

      case "MEDIA_DELETED":
        if (data.payload.blockId) {
          queryClient.invalidateQueries({ 
            queryKey: ["/api/blocks", data.payload.blockId, "media"] 
          });
        }
        break;
      
      case "MEDIA_REORDERED":
        // Update media cache with new order
        if (data.payload.blockId) {
          queryClient.setQueryData(
            ["/api/blocks", data.payload.blockId, "media"],
            data.payload.media
          );
        }
        break;

      case "BATCH_OPERATION":
        // Handle batch operations by invalidating all affected queries
        console.log('Batch operation completed, refreshing all data');
        queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
        // Invalidate all block queries for affected pages
        if (data.payload.affectedPages) {
          data.payload.affectedPages.forEach((pageId: string) => {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/pages", pageId, "blocks"] 
            });
          });
        }
        break;

      default:
        console.log("Unknown WebSocket message type:", data.type);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
