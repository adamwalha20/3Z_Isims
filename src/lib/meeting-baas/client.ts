import {
  MeetingBaaSConfigurationError,
  MeetingBaaSApiError,
} from './errors';

const MEETING_BAAS_API_BASE_URL = 'https://api.meetingbaas.com/v2';

export interface MeetingBaaSClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class MeetingBaaSClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: MeetingBaaSClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.MEETING_BAAS_API_KEY || '';
    this.baseUrl = options.baseUrl || MEETING_BAAS_API_BASE_URL;
    this.timeoutMs = options.timeoutMs || 25000;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes('your-meeting-baas'));
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new MeetingBaaSConfigurationError();
    }
  }

  public async request<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      headers?: Record<string, string>;
      retries?: number;
    } = {}
  ): Promise<T> {
    this.assertConfigured();

    const { method = 'GET', body, headers = {}, retries = method === 'GET' ? 2 : 0 } = options;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const requestHeaders: Record<string, string> = {
      'x-meeting-baas-api-key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    let attempt = 0;
    while (true) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const text = await response.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          json = { rawText: text };
        }

        if (!response.ok) {
          const errorMessage =
            json?.error ||
            json?.message ||
            `Meeting BaaS API error: ${response.status} ${response.statusText}`;

          // Only retry safe idempotent GET operations on 5xx or network hiccups
          if (attempt <= retries && response.status >= 500) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            continue;
          }

          throw new MeetingBaaSApiError(errorMessage, response.status, json);
        }

        return json as T;
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err instanceof MeetingBaaSApiError) {
          throw err;
        }

        const isAbort = err?.name === 'AbortError';
        const msg = isAbort ? `Meeting BaaS request timed out after ${this.timeoutMs}ms` : err?.message || 'Network error';

        if (attempt <= retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        throw new MeetingBaaSApiError(msg, isAbort ? 504 : 502, { originalError: err?.message });
      }
    }
  }
}

let defaultClient: MeetingBaaSClient | null = null;

export function getMeetingBaaSClient(): MeetingBaaSClient {
  if (!defaultClient) {
    defaultClient = new MeetingBaaSClient();
  }
  return defaultClient;
}
