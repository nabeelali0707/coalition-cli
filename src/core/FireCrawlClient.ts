export interface ScrapeResult {
  success: boolean;
  content: string;
  url: string;
  title?: string;
}

export interface CrawlResult {
  success: boolean;
  pages: Array<{
    url: string;
    content: string;
    title?: string;
  }>;
}

export class FireCrawlClient {
  private apiKey: string;
  private baseUrl = "https://api.firecrawl.dev/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async scrapeUrl(url: string): Promise<ScrapeResult> {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          content: `FireCrawl API error (${response.status}): ${errorText}`,
          url,
        };
      }

      const data = (await response.json()) as {
        data?: {
          content?: string;
          markdown?: string;
          title?: string;
        };
      };

      return {
        success: true,
        content: data.data?.markdown || data.data?.content || "(no content)",
        url,
        title: data.data?.title,
      };
    } catch (error) {
      return {
        success: false,
        content: `Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`,
        url,
      };
    }
  }

  async crawlSite(
    startUrl: string,
    options: { limit?: number; allowExternal?: boolean } = {}
  ): Promise<CrawlResult> {
    const { limit = 5 } = options;

    try {
      const response = await fetch(`${this.baseUrl}/crawl`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: startUrl,
          limit,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          pages: [
            {
              url: startUrl,
              content: `FireCrawl API error (${response.status}): ${errorText}`,
            },
          ],
        };
      }

      const data = (await response.json()) as {
        data?: Array<{
          metadata?: { sourceURL?: string; title?: string };
          markdown?: string;
          content?: string;
        }>;
      };

      const pages = (data.data || []).map((page) => ({
        url: page.metadata?.sourceURL || startUrl,
        content: page.markdown || page.content || "(no content)",
        title: page.metadata?.title,
      }));

      return { success: true, pages };
    } catch (error) {
      return {
        success: false,
        pages: [
          {
            url: startUrl,
            content: `Failed to crawl site: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
