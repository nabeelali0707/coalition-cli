import { ToolDefinition, ToolResult } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";
import { FireCrawlClient } from "../core/FireCrawlClient";

let firecrawlClient: FireCrawlClient | null = null;

export function setFireCrawlClient(client: FireCrawlClient): void {
  firecrawlClient = client;
}

export const scrapeUrlTool: ToolDefinition = {
  name: "scrape_url",
  description: "Scrape and return cleaned content from a web URL",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to scrape",
      },
    },
    required: ["url"],
  },
  async execute(args): Promise<ToolResult> {
    const url = args.url as string;

    if (!firecrawlClient) {
      return {
        success: false,
        output: "FireCrawl client not configured. Set FIRECRAWL_API_KEY in .env",
      };
    }

    const result = await firecrawlClient.scrapeUrl(url);

    if (result.success) {
      const output = [
        result.title ? `Title: ${result.title}` : "",
        `URL: ${result.url}`,
        "",
        result.content,
      ]
        .filter(Boolean)
        .join("\n");

      return { success: true, output };
    }

    return { success: false, output: result.content };
  },
};

export const crawlSiteTool: ToolDefinition = {
  name: "crawl_site",
  description:
    "Crawl multiple pages from a starting URL for broader research",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The starting URL to crawl from",
      },
      limit: {
        type: "number",
        description: "Maximum number of pages to crawl (default: 5)",
      },
    },
    required: ["url"],
  },
  async execute(args): Promise<ToolResult> {
    const url = args.url as string;
    const limit = (args.limit as number) || 5;

    if (!firecrawlClient) {
      return {
        success: false,
        output: "FireCrawl client not configured. Set FIRECRAWL_API_KEY in .env",
      };
    }

    const result = await firecrawlClient.crawlSite(url, { limit });

    if (result.success) {
      const output = result.pages
        .map(
          (page, i) =>
            `--- Page ${i + 1} ---\nTitle: ${page.title || "(untitled)"}\nURL: ${page.url}\n\n${page.content}`
        )
        .join("\n\n");

      return {
        success: true,
        output: `Crawled ${result.pages.length} pages:\n\n${output}`,
      };
    }

    return {
      success: false,
      output: result.pages[0]?.content || "Crawl failed",
    };
  },
};
