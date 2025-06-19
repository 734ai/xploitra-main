import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StopCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

export function ActiveScans() {
  const queryClient = useQueryClient();

  const { data: activeScans = [] } = useQuery({
    queryKey: ["/api/scans/active"],
    refetchInterval: 2000,
  });

  const stopScanMutation = useMutation({
    mutationFn: async (scanId: number) => {
      const response = await apiRequest("POST", `/api/scans/${scanId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Scans</CardTitle>
          <Badge variant={activeScans.length > 0 ? "default" : "secondary"} className="bg-green-100 text-green-800">
            {activeScans.length} Running
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activeScans.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active scans</p>
        ) : (
          <div className="space-y-4">
            {activeScans.map((scan: any) => (
              <div key={scan.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium text-gray-900 font-mono text-sm">{scan.targetUrl}</p>
                      <p className="text-sm text-gray-600">
                        Started {formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => stopScanMutation.mutate(scan.id)}
                    disabled={stopScanMutation.isPending}
                    className="text-red-600 hover:text-red-800"
                  >
                    <StopCircle className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{scan.status === 'running' ? 'Scanning endpoints' : 'Starting scan'}</span>
                    <span>{scan.progress}%</span>
                  </div>
                  <Progress value={scan.progress} className="h-2" />
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Endpoints:</span>
                    <span className="font-medium ml-1">{scan.endpointsFound}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tested:</span>
                    <span className="font-medium ml-1">{scan.endpointsTested}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Vulnerabilities:</span>
                    <span className="font-medium ml-1 text-red-600">{scan.vulnerabilitiesFound}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium ml-1 text-blue-600 capitalize">{scan.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
