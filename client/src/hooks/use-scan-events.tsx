import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useScanEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource('/api/scan-events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'update') {
          // Update active scans
          queryClient.setQueryData(["/api/scans/active"], data.data.activeScans);
          
          // Update latest vulnerabilities
          queryClient.setQueryData(["/api/vulnerabilities?limit=5"], data.data.latestVulnerabilities);
          
          // Update stats
          queryClient.setQueryData(["/api/stats"], data.data.stats);
          
          // Invalidate scan history to refresh
          queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
}
