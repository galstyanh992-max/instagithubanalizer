import { GitHubConfigError, GitHubBoundaryError } from './errors';

export interface GitHubIntegrationConfig {
  token: string;
  allowedRepos: string[]; // e.g., ["user/repo1", "org/repo2"]
  // TODO: Groundwork for OAuth/App installation IDs can be added here
}

export class GitHubConfigManager {
  private static instance: GitHubConfigManager;
  private config: GitHubIntegrationConfig | null = null;

  private constructor() {}

  static getInstance(): GitHubConfigManager {
    if (!GitHubConfigManager.instance) {
      GitHubConfigManager.instance = new GitHubConfigManager();
    }
    return GitHubConfigManager.instance;
  }

  /**
   * For MVP/Foundational use, load config from env.
   * In a governed expansion, this would load from a PersistentIntegrationConfig DB model.
   */
  loadConfig(): GitHubIntegrationConfig {
    let cfg = this.config;
    if (!cfg) {
      const token = process.env.GITHUB_TOKEN;
      const rawAllowedRepos = process.env.GITHUB_ALLOWED_REPOS || '';
      const allowedRepos = rawAllowedRepos.split(',').map(r => r.trim()).filter(Boolean);
      cfg = { token: token || '', allowedRepos };
      this.config = cfg;
    }

    if (!cfg.token) {
      throw new GitHubConfigError('GITHUB_TOKEN is missing or empty. Integration is disabled.');
    }

    return cfg;
  }

  assertRepoAllowed(repoFullName: string) {
    const cfg = this.loadConfig();
    
    // If allowedRepos is empty, we treat it as denying all for safety, 
    // OR we could treat it as allow all. 
    // Secure by default: if strict boundary is requested, empty means no access unless explicitly configured.
    // For local dev ease, if the env var isn't set at all, maybe we allow all? 
    // The prompt says "Repository allowlist or boundary mechanism", so let's enforce it strictly unless it's explicitly "*"
    
    if (cfg.allowedRepos.includes('*')) {
      return true; // Wildcard bypass
    }

    if (!cfg.allowedRepos.includes(repoFullName)) {
      throw new GitHubBoundaryError(repoFullName);
    }

    return true;
  }

  // Allow dynamic injection for testing
  setConfigForTest(config: GitHubIntegrationConfig) {
    this.config = config;
  }

  clearConfigForTest() {
    this.config = null;
  }
}

export const githubConfigManager = GitHubConfigManager.getInstance();
