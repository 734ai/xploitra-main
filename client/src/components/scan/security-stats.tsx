import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Shield, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function SecurityStats() {
  const { data: stats = { critical: 0, high: 0, medium: 0, scanned: 0 } } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 10000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="text-red-600 text-xl" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            <p className="text-sm text-gray-600">Critical Issues</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="text-orange-600 text-xl" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
            <p className="text-sm text-gray-600">High Risk</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="text-yellow-600 text-xl" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
            <p className="text-sm text-gray-600">Medium Risk</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="text-green-600 text-xl" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.scanned}</p>
            <p className="text-sm text-gray-600">Sites Scanned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
