import { githubConfigManager } from './config';
import { 
  GitHubAuthError, 
  GitHubRateLimitError, 
  GitHubUpstreamError 
} from './errors';
import { db } from '../db';

export class GitHubClient {
  private static instance: GitHubClient;

  private constructor() {}

  static getInstance(): GitHubClient {
    if (!GitHubClient.instance) {
      GitHubClient.instance = new GitHubClient();
    }
    return GitHubClient.instance;
  }

  async fetch(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const config = githubConfigManager.loadConfig();
    
    // Construct request
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
    
    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Agent-OS-Governed-Client',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (body) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    // Execute Request
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e: any) {
      throw new GitHubUpstreamError(`Network transport failed: ${e.message}`, 0);
    }

    // Audit Logging for ALL actions
    await db.eventLog.create({
      data: {
        eventType: 'github.api_call',
        entityType: 'integration',
        payload: JSON.stringify({ endpoint, method, status: response.status })
      }
    });

    // Handle Errors
    if (!response.ok) {
      if (response.status === 401) {
        throw new GitHubAuthError('Invalid or expired GitHub token');
      }

      if (response.status === 403 || response.status === 429) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0' || response.status === 429) {
          const resetTimeHeader = response.headers.get('x-ratelimit-reset');
          let resetTime: Date | undefined;
          if (resetTimeHeader) {
            resetTime = new Date(parseInt(resetTimeHeader, 10) * 1000);
          }
          throw new GitHubRateLimitError(resetTime);
        }
      }

      let errorData: any;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }

      throw new GitHubUpstreamError(errorData.message || response.statusText, response.status);
    }

    // Return parsed JSON
    if (response.status === 204) {
      return null; // No content
    }

    return response.json();
  }
}

export const githubClient = GitHubClient.getInstance();
