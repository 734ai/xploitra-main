import puppeteer from "puppeteer";
import { URL } from "url";
import { VulnerabilityDetector } from "./vulnerability-detector";
import { AIPayloadGenerator } from "./ai-payload-generator";
import { storage } from "../storage";
import type { Scan } from "@shared/schema";

export interface ScanOptions {
  scanDepth: string;
  aiPayloads: boolean;
  rateLimit: number;
  vulnerabilityTypes: string[];
}

export interface Endpoint {
  url: string;
  method: string;
  parameters: string[];
  forms: Array<{
    action: string;
    method: string;
    inputs: Array<{ name: string; type: string; }>;
  }>;
}

export class Scanner {
  private detector: VulnerabilityDetector;
  private aiGenerator: AIPayloadGenerator;
  private activeScan: boolean = false;

  constructor() {
    this.detector = new VulnerabilityDetector();
    this.aiGenerator = new AIPayloadGenerator();
  }

  async startScan(scanId: number, targetUrl: string, options: ScanOptions): Promise<void> {
    if (this.activeScan) {
      throw new Error("Another scan is already in progress");
    }

    this.activeScan = true;

    try {
      await storage.updateScan(scanId, { 
        status: "running", 
        startedAt: new Date() 
      });

      // Validate URL
      try {
        new URL(targetUrl);
      } catch {
        throw new Error("Invalid URL format");
      }

      const maxDepth = this.getMaxDepth(options.scanDepth);
      const endpoints = await this.crawlEndpoints(scanId, targetUrl, maxDepth, options.rateLimit);
      
      await storage.updateScan(scanId, { 
        endpointsFound: endpoints.length,
        progress: 30
      });

      await this.testEndpoints(scanId, endpoints, options);

      await storage.updateScan(scanId, { 
        status: "completed",
        completedAt: new Date(),
        progress: 100
      });

    } catch (error) {
      await storage.updateScan(scanId, { 
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date()
      });
      throw error;
    } finally {
      this.activeScan = false;
    }
  }

  private getMaxDepth(scanDepth: string): number {
    switch (scanDepth) {
      case "quick": return 1;
      case "standard": return 3;
      case "deep": return 5;
      default: return 3;
    }
  }

  private async crawlEndpoints(scanId: number, baseUrl: string, maxDepth: number, rateLimit: number): Promise<Endpoint[]> {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      const visited = new Set<string>();
      const endpoints: Endpoint[] = [];
      const baseUrlObj = new URL(baseUrl);

      await this.crawlPage(page, baseUrl, baseUrlObj.origin, visited, endpoints, maxDepth, 0, rateLimit);
      
      return endpoints;
    } finally {
      await browser.close();
    }
  }

  private async crawlPage(
    page: any, 
    url: string, 
    baseOrigin: string, 
    visited: Set<string>, 
    endpoints: Endpoint[], 
    maxDepth: number, 
    currentDepth: number,
    rateLimit: number
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(url)) {
      return;
    }

    visited.add(url);

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000 / rateLimit));

      // Extract forms
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action || window.location.href,
          method: (form.method || 'GET').toUpperCase(),
          inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
            name: input.name || '',
            type: input.type || 'text'
          })).filter(input => input.name)
        }));
      });

      // Extract URL parameters
      const urlObj = new URL(url);
      const parameters = Array.from(urlObj.searchParams.keys());

      endpoints.push({
        url,
        method: 'GET',
        parameters,
        forms
      });

      // Find links for deeper crawling
      if (currentDepth < maxDepth - 1) {
        const links = await page.evaluate((baseOrigin: string) => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(link => {
              try {
                const href = (link as HTMLAnchorElement).href;
                const url = new URL(href);
                return url.origin === baseOrigin ? href : null;
              } catch {
                return null;
              }
            })
            .filter(Boolean) as string[];
        }, baseOrigin);

        // Crawl unique links
        const uniqueLinks = [...new Set(links)].slice(0, 10); // Limit to prevent excessive crawling
        for (const link of uniqueLinks) {
          await this.crawlPage(page, link, baseOrigin, visited, endpoints, maxDepth, currentDepth + 1, rateLimit);
        }
      }

    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    }
  }

  private async testEndpoints(scanId: number, endpoints: Endpoint[], options: ScanOptions): Promise<void> {
    let tested = 0;
    const total = endpoints.length;

    for (const endpoint of endpoints) {
      // Test GET parameters
      if (endpoint.parameters.length > 0 && options.vulnerabilityTypes.includes('xss')) {
        await this.testXSS(scanId, endpoint, options.aiPayloads);
      }

      if (endpoint.parameters.length > 0 && options.vulnerabilityTypes.includes('sqli')) {
        await this.testSQLInjection(scanId, endpoint, options.aiPayloads);
      }

      if (options.vulnerabilityTypes.includes('directory_traversal')) {
        await this.testDirectoryTraversal(scanId, endpoint, options.aiPayloads);
      }

      // Test forms
      for (const form of endpoint.forms) {
        if (form.inputs.length > 0) {
          if (options.vulnerabilityTypes.includes('xss')) {
            await this.testFormXSS(scanId, endpoint, form, options.aiPayloads);
          }
          if (options.vulnerabilityTypes.includes('sqli')) {
            await this.testFormSQLI(scanId, endpoint, form, options.aiPayloads);
          }
        }
      }

      tested++;
      const progress = Math.min(30 + Math.floor((tested / total) * 60), 90);
      await storage.updateScan(scanId, { 
        endpointsTested: tested,
        progress
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000 / options.rateLimit));
    }
  }

  private async testXSS(scanId: number, endpoint: Endpoint, useAI: boolean): Promise<void> {
    const payloads = useAI 
      ? await this.aiGenerator.generateXSSPayloads(endpoint.url)
      : this.detector.getBasicXSSPayloads();

    for (const param of endpoint.parameters) {
      for (const payload of payloads.slice(0, 3)) { // Limit payloads
        try {
          const testUrl = new URL(endpoint.url);
          testUrl.searchParams.set(param, payload);
          
          if (await this.detector.testXSSVulnerability(testUrl.toString(), payload)) {
            await storage.createVulnerability({
              scanId,
              type: 'xss',
              severity: 'high',
              title: 'Cross-Site Scripting (XSS)',
              description: `Parameter '${param}' is vulnerable to XSS attacks`,
              endpoint: endpoint.url,
              parameter: param,
              payload,
              evidence: `Payload executed: ${payload}`,
              remediation: 'Implement proper input validation and output encoding'
            });

            const scan = await storage.getScan(scanId);
            if (scan) {
              await storage.updateScan(scanId, { 
                vulnerabilitiesFound: scan.vulnerabilitiesFound + 1 
              });
            }
          }
        } catch (error) {
          console.error(`Error testing XSS on ${endpoint.url}:`, error);
        }
      }
    }
  }

  private async testSQLInjection(scanId: number, endpoint: Endpoint, useAI: boolean): Promise<void> {
    const payloads = useAI 
      ? await this.aiGenerator.generateSQLIPayloads(endpoint.url)
      : this.detector.getBasicSQLIPayloads();

    for (const param of endpoint.parameters) {
      for (const payload of payloads.slice(0, 3)) {
        try {
          const testUrl = new URL(endpoint.url);
          testUrl.searchParams.set(param, payload);
          
          if (await this.detector.testSQLIVulnerability(testUrl.toString(), payload)) {
            await storage.createVulnerability({
              scanId,
              type: 'sqli',
              severity: 'critical',
              title: 'SQL Injection',
              description: `Parameter '${param}' is vulnerable to SQL injection attacks`,
              endpoint: endpoint.url,
              parameter: param,
              payload,
              evidence: `SQL injection successful with payload: ${payload}`,
              remediation: 'Use parameterized queries and input validation'
            });

            const scan = await storage.getScan(scanId);
            if (scan) {
              await storage.updateScan(scanId, { 
                vulnerabilitiesFound: scan.vulnerabilitiesFound + 1 
              });
            }
          }
        } catch (error) {
          console.error(`Error testing SQL injection on ${endpoint.url}:`, error);
        }
      }
    }
  }

  private async testDirectoryTraversal(scanId: number, endpoint: Endpoint, useAI: boolean): Promise<void> {
    const payloads = useAI 
      ? await this.aiGenerator.generateDirectoryTraversalPayloads(endpoint.url)
      : this.detector.getBasicDirectoryTraversalPayloads();

    for (const param of endpoint.parameters) {
      for (const payload of payloads.slice(0, 2)) {
        try {
          const testUrl = new URL(endpoint.url);
          testUrl.searchParams.set(param, payload);
          
          if (await this.detector.testDirectoryTraversalVulnerability(testUrl.toString(), payload)) {
            await storage.createVulnerability({
              scanId,
              type: 'directory_traversal',
              severity: 'medium',
              title: 'Directory Traversal',
              description: `Parameter '${param}' allows access to system files`,
              endpoint: endpoint.url,
              parameter: param,
              payload,
              evidence: `Directory traversal successful with payload: ${payload}`,
              remediation: 'Implement proper file path validation and access controls'
            });

            const scan = await storage.getScan(scanId);
            if (scan) {
              await storage.updateScan(scanId, { 
                vulnerabilitiesFound: scan.vulnerabilitiesFound + 1 
              });
            }
          }
        } catch (error) {
          console.error(`Error testing directory traversal on ${endpoint.url}:`, error);
        }
      }
    }
  }

  private async testFormXSS(scanId: number, endpoint: Endpoint, form: any, useAI: boolean): Promise<void> {
    const payloads = useAI 
      ? await this.aiGenerator.generateXSSPayloads(form.action)
      : this.detector.getBasicXSSPayloads();

    for (const input of form.inputs) {
      if (input.type === 'text' || input.type === 'email' || input.type === 'search') {
        for (const payload of payloads.slice(0, 2)) {
          try {
            if (await this.detector.testFormXSSVulnerability(form.action, form.method, input.name, payload)) {
              await storage.createVulnerability({
                scanId,
                type: 'xss',
                severity: 'high',
                title: 'Cross-Site Scripting (XSS) in Form',
                description: `Form input '${input.name}' is vulnerable to XSS attacks`,
                endpoint: form.action,
                parameter: input.name,
                payload,
                evidence: `XSS payload executed in form: ${payload}`,
                remediation: 'Implement proper input validation and output encoding for form inputs'
              });

              const scan = await storage.getScan(scanId);
              if (scan) {
                await storage.updateScan(scanId, { 
                  vulnerabilitiesFound: scan.vulnerabilitiesFound + 1 
                });
              }
            }
          } catch (error) {
            console.error(`Error testing form XSS on ${form.action}:`, error);
          }
        }
      }
    }
  }

  private async testFormSQLI(scanId: number, endpoint: Endpoint, form: any, useAI: boolean): Promise<void> {
    const payloads = useAI 
      ? await this.aiGenerator.generateSQLIPayloads(form.action)
      : this.detector.getBasicSQLIPayloads();

    for (const input of form.inputs) {
      if (input.type === 'text' || input.type === 'email' || input.type === 'password') {
        for (const payload of payloads.slice(0, 2)) {
          try {
            if (await this.detector.testFormSQLIVulnerability(form.action, form.method, input.name, payload)) {
              await storage.createVulnerability({
                scanId,
                type: 'sqli',
                severity: 'critical',
                title: 'SQL Injection in Form',
                description: `Form input '${input.name}' is vulnerable to SQL injection attacks`,
                endpoint: form.action,
                parameter: input.name,
                payload,
                evidence: `SQL injection successful in form: ${payload}`,
                remediation: 'Use parameterized queries and proper input validation for form data'
              });

              const scan = await storage.getScan(scanId);
              if (scan) {
                await storage.updateScan(scanId, { 
                  vulnerabilitiesFound: scan.vulnerabilitiesFound + 1 
                });
              }
            }
          } catch (error) {
            console.error(`Error testing form SQL injection on ${form.action}:`, error);
          }
        }
      }
    }
  }
}
