import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: number | null;
}

export function ExportModal({ isOpen, onClose, scanId }: ExportModalProps) {
  const [format, setFormat] = useState("json");
  const [includeVulns, setIncludeVulns] = useState(true);
  const [includeRemediation, setIncludeRemediation] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeAI, setIncludeAI] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();

  const handleExport = async () => {
    if (!scanId) return;

    setIsExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (includeAI) {
        params.append('includeAI', 'true');
      }
      const url = `/api/scans/${scanId}/export?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `scan-${scanId}-${Date.now()}.${format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export Successful",
        description: "Scan results have been downloaded.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export scan results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Export Scan Results</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Export Format</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="text-sm">PDF Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="text-sm">JSON Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="text-sm">CSV Summary</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Include</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vulns"
                  checked={includeVulns}
                  onCheckedChange={(checked) => setIncludeVulns(checked === true)}
                />
                <Label htmlFor="vulns" className="text-sm">Vulnerability Details</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remediation"
                  checked={includeRemediation}
                  onCheckedChange={(checked) => setIncludeRemediation(checked === true)}
                />
                <Label htmlFor="remediation" className="text-sm">Remediation Steps</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked === true)}
                />
                <Label htmlFor="metadata" className="text-sm">Scan Metadata</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="aiAnalysis"
                  checked={includeAI}
                  onCheckedChange={(checked) => setIncludeAI(checked === true)}
                />
                <Label htmlFor="aiAnalysis" className="text-sm">AI Risk Analysis</Label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
