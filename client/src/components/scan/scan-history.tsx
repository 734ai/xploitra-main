import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface ScanHistoryProps {
  onExport: (scanId: number) => void;
  onAIAnalysis: (scanId: number) => void;
}

export function ScanHistory({ onExport, onAIAnalysis }: ScanHistoryProps) {
  const { data: scans = [] } = useQuery({
    queryKey: ["/api/scans?limit=10"],
    refetchInterval: 10000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedScans = (scans as any[]).filter((scan: any) => scan.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Scans</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            Export <Download className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {completedScans.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No completed scans yet</p>
        ) : (
          <div className="space-y-3">
            {completedScans.slice(0, 5).map((scan: any) => (
              <div key={scan.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm font-mono text-gray-900">
                    {new URL(scan.targetUrl).hostname}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })}
                    </span>
                    {scan.vulnerabilitiesFound > 0 && (
                      <>
                        {scan.vulnerabilitiesFound > 0 && (
                          <span className="text-xs text-red-600 font-medium">
                            {scan.vulnerabilitiesFound} Issues
                          </span>
                        )}
                      </>
                    )}
                    {scan.vulnerabilitiesFound === 0 && (
                      <span className="text-xs text-green-600 font-medium">Clean</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor((scan as any).status)}>
                    {(scan as any).status}
                  </Badge>
                  {(scan as any).status === 'completed' && (scan as any).vulnerabilitiesFound > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAIAnalysis((scan as any).id)}
                      className="text-blue-500 hover:text-blue-700"
                      title="AI Risk Analysis"
                    >
                      <Brain className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExport((scan as any).id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
