import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  targetUrl: text("target_url").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  progress: integer("progress").notNull().default(0),
  scanDepth: text("scan_depth").notNull().default("standard"),
  aiPayloads: boolean("ai_payloads").notNull().default(true),
  rateLimit: integer("rate_limit").notNull().default(5),
  vulnerabilityTypes: text("vulnerability_types").array().notNull().default([]),
  endpointsFound: integer("endpoints_found").notNull().default(0),
  endpointsTested: integer("endpoints_tested").notNull().default(0),
  vulnerabilitiesFound: integer("vulnerabilities_found").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
});

export const vulnerabilities = pgTable("vulnerabilities", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull(),
  type: text("type").notNull(), // xss, sqli, directory_traversal, etc.
  severity: text("severity").notNull(), // critical, high, medium, low, info
  title: text("title").notNull(),
  description: text("description").notNull(),
  endpoint: text("endpoint").notNull(),
  parameter: text("parameter"),
  payload: text("payload"),
  evidence: text("evidence"),
  remediation: text("remediation"),
  foundAt: timestamp("found_at").defaultNow(),
});

export const scanResults = pgTable("scan_results", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull(),
  endpoints: jsonb("endpoints").notNull().default([]),
  scanMetadata: jsonb("scan_metadata").notNull().default({}),
  exportedAt: timestamp("exported_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertScanSchema = createInsertSchema(scans).pick({
  targetUrl: true,
  scanDepth: true,
  aiPayloads: true,
  rateLimit: true,
  vulnerabilityTypes: true,
});

export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).pick({
  scanId: true,
  type: true,
  severity: true,
  title: true,
  description: true,
  endpoint: true,
  parameter: true,
  payload: true,
  evidence: true,
  remediation: true,
});

export const insertScanResultSchema = createInsertSchema(scanResults).pick({
  scanId: true,
  endpoints: true,
  scanMetadata: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;

export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;

export type InsertScanResult = z.infer<typeof insertScanResultSchema>;
export type ScanResult = typeof scanResults.$inferSelect;
