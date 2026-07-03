export class GitHubIntegrationError extends Error {
  constructor(message: string, public statusCode?: number, public code?: string) {
    super(message);
    this.name = 'GitHubIntegrationError';
  }
}

export class GitHubConfigError extends GitHubIntegrationError {
  constructor(message: string) {
    super(message, 500, 'MISSING_CONFIG');
    this.name = 'GitHubConfigError';
  }
}

export class GitHubAuthError extends GitHubIntegrationError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'GitHubAuthError';
  }
}

export class GitHubBoundaryError extends GitHubIntegrationError {
  constructor(repoFullName: string) {
    super(`Repository '${repoFullName}' is not in the allowed boundary.`, 403, 'REPO_NOT_ALLOWED');
    this.name = 'GitHubBoundaryError';
  }
}

export class GitHubRateLimitError extends GitHubIntegrationError {
  constructor(resetTime?: Date) {
    const msg = resetTime 
      ? `Rate limit exceeded. Resets at ${resetTime.toISOString()}`
      : 'Rate limit exceeded.';
    super(msg, 429, 'RATE_LIMIT');
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubUpstreamError extends GitHubIntegrationError {
  constructor(message: string, statusCode: number) {
    super(`Upstream GitHub Error: ${message}`, statusCode, 'UPSTREAM_ERROR');
    this.name = 'GitHubUpstreamError';
  }
}
