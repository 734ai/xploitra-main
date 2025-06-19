import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function ScanConfiguration() {
  const [targetUrl, setTargetUrl] = useState("");
  const [scanDepth, setScanDepth] = useState("standard");
  const [aiPayloads, setAiPayloads] = useState(true);
  const [rateLimit, setRateLimit] = useState("5");
  const [vulnerabilityTypes, setVulnerabilityTypes] = useState<string[]>(["xss", "sqli", "directory_traversal"]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startScanMutation = useMutation({
    mutationFn: async (scanData: any) => {
      const response = await apiRequest("POST", "/api/scans", scanData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Scan Started",
        description: "Your vulnerability scan has been started successfully.",
      });
      setTargetUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scans/active"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start scan. Please check your URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleVulnerabilityTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setVulnerabilityTypes([...vulnerabilityTypes, type]);
    } else {
      setVulnerabilityTypes(vulnerabilityTypes.filter(t => t !== type));
    }
  };

  const handleStartScan = () => {
    if (!targetUrl) {
      toast({
        title: "Error",
        description: "Please enter a target URL.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(targetUrl);
    } catch {
      toast({
        title: "Error",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    startScanMutation.mutate({
      targetUrl,
      scanDepth,
      aiPayloads,
      rateLimit: parseInt(rateLimit),
      vulnerabilityTypes,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start New Scan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        <div>
          <Label htmlFor="targetUrl" className="text-sm font-medium text-gray-700 mb-2">
            Target URL
          </Label>
          <div className="flex space-x-3">
            <Input
              id="targetUrl"
              type="url"
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
            <Button 
              onClick={handleStartScan}
              disabled={startScanMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {startScanMutation.isPending ? "Starting..." : "Start Scan"}
            </Button>
          </div>
        </div>

        {/* Scan Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Scan Depth</Label>
            <Select value={scanDepth} onValueChange={setScanDepth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Quick Scan (1 level)</SelectItem>
                <SelectItem value="standard">Standard (3 levels)</SelectItem>
                <SelectItem value="deep">Deep Scan (5 levels)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">AI Payload Generation</Label>
            <Select value={aiPayloads ? "enabled" : "disabled"} onValueChange={(value) => setAiPayloads(value === "enabled")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="enabled">Basic AI Payloads</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Rate Limiting</Label>
            <Select value={rateLimit} onValueChange={setRateLimit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Slow (1 req/sec)</SelectItem>
                <SelectItem value="5">Normal (5 req/sec)</SelectItem>
                <SelectItem value="10">Fast (10 req/sec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vulnerability Types */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3">Vulnerability Types to Check</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="xss"
                checked={vulnerabilityTypes.includes("xss")}
                onCheckedChange={(checked) => handleVulnerabilityTypeChange("xss", checked as boolean)}
              />
              <Label htmlFor="xss" className="text-sm text-gray-700">XSS</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sqli"
                checked={vulnerabilityTypes.includes("sqli")}
                onCheckedChange={(checked) => handleVulnerabilityTypeChange("sqli", checked as boolean)}
              />
              <Label htmlFor="sqli" className="text-sm text-gray-700">SQL Injection</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="directory_traversal"
                checked={vulnerabilityTypes.includes("directory_traversal")}
                onCheckedChange={(checked) => handleVulnerabilityTypeChange("directory_traversal", checked as boolean)}
              />
              <Label htmlFor="directory_traversal" className="text-sm text-gray-700">Directory Traversal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="csrf"
                checked={vulnerabilityTypes.includes("csrf")}
                onCheckedChange={(checked) => handleVulnerabilityTypeChange("csrf", checked as boolean)}
              />
              <Label htmlFor="csrf" className="text-sm text-gray-700">CSRF</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
