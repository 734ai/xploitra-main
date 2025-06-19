import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Scanner } from "./services/scanner";
import { AIVulnerabilityAnalyzer } from "./services/ai-vulnerability-analyzer";
import { insertScanSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const scanner = new Scanner();
  const aiAnalyzer = new AIVulnerabilityAnalyzer();

  // SSE endpoint for real-time scan updates
  app.get("/api/scan-events", (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial data
    sendEvent({ type: 'connected' });

    // Send updates every 2 seconds
    const interval = setInterval(async () => {
      try {
        const activeScans = await storage.getActiveScans();
        const latestVulns = await storage.getLatestVulnerabilities(5);
        const stats = await storage.getSecurityStats();
        
        sendEvent({
          type: 'update',
          data: {
            activeScans,
            latestVulnerabilities: latestVulns,
            stats
          }
        });
      } catch (error) {
        console.error('Error sending SSE update:', error);
      }
    }, 2000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // Start new scan
  app.post("/api/scans", async (req: Request, res: Response) => {
    try {
      const validatedData = insertScanSchema.parse(req.body);
      
      const scan = await storage.createScan(validatedData);
      
      // Start scanning in background
      scanner.startScan(scan.id, scan.targetUrl, {
        scanDepth: scan.scanDepth,
        aiPayloads: scan.aiPayloads,
        rateLimit: scan.rateLimit,
        vulnerabilityTypes: scan.vulnerabilityTypes
      }).catch(error => {
        console.error(`Scan ${scan.id} failed:`, error);
      });

      res.json(scan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid scan configuration", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to start scan" });
      }
    }
  });

  // Get active scans - must come before parameterized routes
  app.get("/api/scans/active", async (req: Request, res: Response) => {
    try {
      const scans = await storage.getActiveScans();
      res.json(scans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active scans" });
    }
  });

  // Get scan history
  app.get("/api/scans", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const scans = await storage.getScans(limit);
      res.json(scans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get scan history" });
    }
  });

  // Get scan details
  app.get("/api/scans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const scan = await storage.getScan(id);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      const vulnerabilities = await storage.getVulnerabilitiesByScan(id);
      
      res.json({
        ...scan,
        vulnerabilities
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get scan" });
    }
  });

  // Stop scan
  app.post("/api/scans/:id/stop", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const scan = await storage.updateScan(id, { 
        status: "failed", 
        error: "Stopped by user",
        completedAt: new Date()
      });
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      res.json(scan);
    } catch (error) {
      res.status(500).json({ message: "Failed to stop scan" });
    }
  });

  // Get vulnerabilities
  app.get("/api/vulnerabilities", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const vulnerabilities = await storage.getLatestVulnerabilities(limit);
      res.json(vulnerabilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get vulnerabilities" });
    }
  });

  // Get security stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getSecurityStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Get AI-prioritized vulnerability analysis
  app.get("/api/scans/:id/ai-analysis", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const scan = await storage.getScan(id);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      if (scan.status !== 'completed') {
        return res.status(400).json({ message: "Scan must be completed for AI analysis" });
      }

      const vulnerabilities = await storage.getVulnerabilitiesByScan(id);
      
      if (vulnerabilities.length === 0) {
        return res.json({
          scanId: id,
          totalVulnerabilities: 0,
          riskDistribution: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          topPriorityVulnerabilities: [],
          recommendedActionPlan: "No vulnerabilities found. Continue regular security monitoring.",
          executiveSummary: "Security scan completed successfully with no vulnerabilities detected."
        });
      }

      const analysis = await aiAnalyzer.prioritizeVulnerabilities(
        vulnerabilities,
        scan.targetUrl,
        { 
          scanDepth: scan.scanDepth,
          businessContext: req.query.businessContext as string
        }
      );

      res.json(analysis);
    } catch (error) {
      console.error("Error in AI analysis:", error);
      res.status(500).json({ message: "Failed to generate AI analysis" });
    }
  });

  // Get vulnerability risk insights
  app.get("/api/vulnerabilities/:id/ai-insights", async (req: Request, res: Response) => {
    try {
      const vulnerabilityId = parseInt(req.params.id);
      const vulnerabilities = await storage.getLatestVulnerabilities(1000);
      const targetVuln = vulnerabilities.find(v => v.id === vulnerabilityId);
      
      if (!targetVuln) {
        return res.status(404).json({ message: "Vulnerability not found" });
      }

      const scan = await storage.getScan(targetVuln.scanId);
      if (!scan) {
        return res.status(404).json({ message: "Associated scan not found" });
      }

      const analysis = await aiAnalyzer.prioritizeVulnerabilities(
        [targetVuln],
        scan.targetUrl,
        { scanDepth: scan.scanDepth }
      );

      const insights = analysis.topPriorityVulnerabilities[0];
      res.json(insights || {});
    } catch (error) {
      console.error("Error getting vulnerability insights:", error);
      res.status(500).json({ message: "Failed to get vulnerability insights" });
    }
  });

  // Export scan results
  app.get("/api/scans/:id/export", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const format = req.query.format as string || 'json';
      const includeAI = req.query.includeAI === 'true';
      
      const scan = await storage.getScan(id);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      const vulnerabilities = await storage.getVulnerabilitiesByScan(id);
      let aiAnalysis = null;

      // Include AI analysis if requested and scan is completed
      if (includeAI && scan.status === 'completed' && vulnerabilities.length > 0) {
        try {
          aiAnalysis = await aiAnalyzer.prioritizeVulnerabilities(
            vulnerabilities,
            scan.targetUrl,
            { scanDepth: scan.scanDepth }
          );
        } catch (error) {
          console.error("Error generating AI analysis for export:", error);
        }
      }

      if (format === 'json') {
        const exportData = {
          scan,
          vulnerabilities,
          aiAnalysis,
          exportedAt: new Date().toISOString()
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="scan-${id}-${Date.now()}.json"`);
        res.json(exportData);
      } else if (format === 'pdf') {
        const reportText = generateTextReport(scan, vulnerabilities, aiAnalysis);
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="scan-${id}-${Date.now()}.txt"`);
        res.send(reportText);
      } else {
        res.status(400).json({ message: "Unsupported export format" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export scan results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateTextReport(scan: any, vulnerabilities: any[], aiAnalysis?: any): string {
  let report = `XPLOITRA SECURITY SCAN REPORT\n`;
  report += `=====================================\n\n`;
  report += `Target URL: ${scan.targetUrl}\n`;
  report += `Scan Started: ${scan.startedAt}\n`;
  report += `Scan Completed: ${scan.completedAt || 'N/A'}\n`;
  report += `Status: ${scan.status}\n`;
  report += `Endpoints Found: ${scan.endpointsFound}\n`;
  report += `Endpoints Tested: ${scan.endpointsTested}\n`;
  report += `Vulnerabilities Found: ${scan.vulnerabilitiesFound}\n\n`;

  // Include AI Analysis summary if available
  if (aiAnalysis) {
    report += `AI RISK ASSESSMENT\n`;
    report += `==================\n\n`;
    report += `Executive Summary:\n${aiAnalysis.executiveSummary}\n\n`;
    
    report += `Risk Distribution:\n`;
    report += `- Critical: ${aiAnalysis.riskDistribution.critical}\n`;
    report += `- High: ${aiAnalysis.riskDistribution.high}\n`;
    report += `- Medium: ${aiAnalysis.riskDistribution.medium}\n`;
    report += `- Low: ${aiAnalysis.riskDistribution.low}\n\n`;
    
    report += `Recommended Action Plan:\n${aiAnalysis.recommendedActionPlan}\n\n`;
  }

  if (vulnerabilities.length > 0) {
    report += `VULNERABILITIES FOUND\n`;
    report += `====================\n\n`;
    
    // Sort vulnerabilities by AI risk score if available
    const sortedVulns = aiAnalysis ? 
      vulnerabilities.sort((a: any, b: any) => {
        const aRisk = aiAnalysis.topPriorityVulnerabilities.find((r: any) => r.vulnerabilityId === a.id);
        const bRisk = aiAnalysis.topPriorityVulnerabilities.find((r: any) => r.vulnerabilityId === b.id);
        return (bRisk?.riskScore || 0) - (aRisk?.riskScore || 0);
      }) : vulnerabilities;

    sortedVulns.forEach((vuln: any, index: number) => {
      const aiRisk = aiAnalysis?.topPriorityVulnerabilities.find((r: any) => r.vulnerabilityId === vuln.id);
      
      report += `${index + 1}. ${vuln.title}\n`;
      report += `   Severity: ${vuln.severity.toUpperCase()}\n`;
      if (aiRisk) {
        report += `   AI Risk Score: ${aiRisk.riskScore}/10\n`;
        report += `   AI Risk Level: ${aiRisk.riskLevel.toUpperCase()}\n`;
        report += `   Urgency: ${aiRisk.urgency.toUpperCase()}\n`;
      }
      report += `   Type: ${vuln.type}\n`;
      report += `   Endpoint: ${vuln.endpoint}\n`;
      if (vuln.parameter) {
        report += `   Parameter: ${vuln.parameter}\n`;
      }
      report += `   Description: ${vuln.description}\n`;
      if (vuln.payload) {
        report += `   Payload: ${vuln.payload}\n`;
      }
      if (aiRisk?.aiReasoning) {
        report += `   AI Assessment: ${aiRisk.aiReasoning}\n`;
      }
      report += `   Remediation: ${vuln.remediation}\n\n`;
    });
  } else {
    report += `No vulnerabilities found.\n`;
  }

  report += `\nReport generated by Xploitra v1.0\n`;
  report += `For authorized testing only.\n`;
  
  return report;
}
