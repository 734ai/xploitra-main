import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ScanConfiguration } from "@/components/scan/scan-configuration";
import { ActiveScans } from "@/components/scan/active-scans";
import { VulnerabilityResults } from "@/components/scan/vulnerability-results";
import { ScanHistory } from "@/components/scan/scan-history";
import { SecurityStats } from "@/components/scan/security-stats";
import { AIVulnerabilityAnalysis } from "@/components/scan/ai-vulnerability-analysis";
import { ExportModal } from "@/components/modals/export-modal";
import { useScanEvents } from "@/hooks/use-scan-events";
import { useState } from "react";

export default function Dashboard() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [aiAnalysisScanId, setAiAnalysisScanId] = useState<number>(0);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  
  // Real-time updates via SSE
  useScanEvents();

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        <Header />
        
        <div className="flex-1 p-6 space-y-6">
          <ScanConfiguration />
          <ActiveScans />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VulnerabilityResults />
            <ScanHistory 
              onExport={(scanId) => {
                setSelectedScanId(scanId);
                setIsExportModalOpen(true);
              }}
              onAIAnalysis={(scanId) => {
                setAiAnalysisScanId(scanId);
                setShowAiAnalysis(true);
              }}
            />
          </div>

          {/* AI Vulnerability Analysis */}
          <AIVulnerabilityAnalysis
            scanId={aiAnalysisScanId}
            isVisible={showAiAnalysis}
            onToggle={() => setShowAiAnalysis(!showAiAnalysis)}
          />

          <SecurityStats />
        </div>
      </main>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        scanId={selectedScanId}
      />
    </div>
  );
}
