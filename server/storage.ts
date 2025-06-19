import { users, scans, vulnerabilities, scanResults, type User, type InsertUser, type Scan, type InsertScan, type Vulnerability, type InsertVulnerability, type ScanResult, type InsertScanResult } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  updateScan(id: number, updates: Partial<Scan>): Promise<Scan | undefined>;
  getScans(limit?: number): Promise<Scan[]>;
  getActiveScans(): Promise<Scan[]>;
  
  createVulnerability(vulnerability: InsertVulnerability): Promise<Vulnerability>;
  getVulnerabilitiesByScan(scanId: number): Promise<Vulnerability[]>;
  getLatestVulnerabilities(limit?: number): Promise<Vulnerability[]>;
  
  createScanResult(result: InsertScanResult): Promise<ScanResult>;
  getScanResult(scanId: number): Promise<ScanResult | undefined>;
  
  getSecurityStats(): Promise<{
    critical: number;
    high: number;
    medium: number;
    scanned: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private scans: Map<number, Scan>;
  private vulnerabilities: Map<number, Vulnerability>;
  private scanResults: Map<number, ScanResult>;
  private currentUserId: number;
  private currentScanId: number;
  private currentVulnId: number;
  private currentResultId: number;

  constructor() {
    this.users = new Map();
    this.scans = new Map();
    this.vulnerabilities = new Map();
    this.scanResults = new Map();
    this.currentUserId = 1;
    this.currentScanId = 1;
    this.currentVulnId = 1;
    this.currentResultId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const id = this.currentScanId++;
    const now = new Date();
    const scan: Scan = {
      id,
      targetUrl: insertScan.targetUrl,
      scanDepth: insertScan.scanDepth || "standard",
      aiPayloads: insertScan.aiPayloads ?? true,
      rateLimit: insertScan.rateLimit || 5,
      vulnerabilityTypes: insertScan.vulnerabilityTypes || [],
      status: "pending",
      progress: 0,
      endpointsFound: 0,
      endpointsTested: 0,
      vulnerabilitiesFound: 0,
      startedAt: now,
      completedAt: null,
      error: null,
    };
    this.scans.set(id, scan);
    return scan;
  }

  async getScan(id: number): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async updateScan(id: number, updates: Partial<Scan>): Promise<Scan | undefined> {
    const scan = this.scans.get(id);
    if (!scan) return undefined;
    
    const updatedScan = { ...scan, ...updates };
    this.scans.set(id, updatedScan);
    return updatedScan;
  }

  async getScans(limit = 50): Promise<Scan[]> {
    return Array.from(this.scans.values())
      .sort((a, b) => new Date(b.startedAt!).getTime() - new Date(a.startedAt!).getTime())
      .slice(0, limit);
  }

  async getActiveScans(): Promise<Scan[]> {
    return Array.from(this.scans.values())
      .filter(scan => scan.status === "running" || scan.status === "pending");
  }

  async createVulnerability(insertVuln: InsertVulnerability): Promise<Vulnerability> {
    const id = this.currentVulnId++;
    const now = new Date();
    const vulnerability: Vulnerability = {
      id,
      scanId: insertVuln.scanId,
      type: insertVuln.type,
      severity: insertVuln.severity,
      title: insertVuln.title,
      description: insertVuln.description,
      endpoint: insertVuln.endpoint,
      parameter: insertVuln.parameter || null,
      payload: insertVuln.payload || null,
      evidence: insertVuln.evidence || null,
      remediation: insertVuln.remediation || null,
      foundAt: now,
    };
    this.vulnerabilities.set(id, vulnerability);
    return vulnerability;
  }

  async getVulnerabilitiesByScan(scanId: number): Promise<Vulnerability[]> {
    return Array.from(this.vulnerabilities.values())
      .filter(vuln => vuln.scanId === scanId)
      .sort((a, b) => new Date(b.foundAt!).getTime() - new Date(a.foundAt!).getTime());
  }

  async getLatestVulnerabilities(limit = 10): Promise<Vulnerability[]> {
    return Array.from(this.vulnerabilities.values())
      .sort((a, b) => new Date(b.foundAt!).getTime() - new Date(a.foundAt!).getTime())
      .slice(0, limit);
  }

  async createScanResult(insertResult: InsertScanResult): Promise<ScanResult> {
    const id = this.currentResultId++;
    const now = new Date();
    const result: ScanResult = {
      id,
      scanId: insertResult.scanId,
      endpoints: insertResult.endpoints || [],
      scanMetadata: insertResult.scanMetadata || {},
      exportedAt: now,
    };
    this.scanResults.set(id, result);
    return result;
  }

  async getScanResult(scanId: number): Promise<ScanResult | undefined> {
    return Array.from(this.scanResults.values())
      .find(result => result.scanId === scanId);
  }

  async getSecurityStats(): Promise<{
    critical: number;
    high: number;
    medium: number;
    scanned: number;
  }> {
    const vulns = Array.from(this.vulnerabilities.values());
    return {
      critical: vulns.filter(v => v.severity === "critical").length,
      high: vulns.filter(v => v.severity === "high").length,
      medium: vulns.filter(v => v.severity === "medium").length,
      scanned: this.scans.size,
    };
  }
}

export const storage = new MemStorage();
