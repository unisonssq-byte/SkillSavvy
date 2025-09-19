import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectCount = useRef(0);

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
        if (reconnectCount.current < 5) {
          const delay = Math.pow(2, reconnectCount.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCount.current += 1;
            connect();
          }, delay);
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
        queryClient.invalidateQueries({ 
          queryKey: ["/api/pages", data.payload.pageId, "blocks"] 
        });
        break;

      case "BLOCK_UPDATED":
        queryClient.invalidateQueries({ 
          queryKey: ["/api/pages", data.payload.pageId, "blocks"] 
        });
        break;

      case "BLOCK_DELETED":
        queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
        break;

      case "MEDIA_UPLOADED":
        if (data.payload.blockId) {
          queryClient.invalidateQueries({ 
            queryKey: ["/api/blocks", data.payload.blockId, "media"] 
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
